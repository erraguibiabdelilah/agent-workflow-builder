"""Execution management endpoints."""
import asyncio
import json
from datetime import timezone
from typing import AsyncIterator

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.dependencies import get_current_active_user
from ..db.models import User, Workflow, Execution, ExecutionNode, ExecutionEvent
from ..db.database import get_async_session
from ..engine.executor import executor, ExecutionQueueFull
from ..engine.events import get_event_emitter
from ..engine.graph import WorkflowGraph

router = APIRouter()


class ExecuteWorkflowRequest(BaseModel):
    """Request to execute a workflow."""
    triggerNodeId: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = None


class ExecutionResponse(BaseModel):
    """Response from workflow execution."""
    executionId: str


@router.post("/workflows/{workflow_id}/execute", response_model=ExecutionResponse)
async def execute_workflow(
    workflow_id: str,
    request: ExecuteWorkflowRequest,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user)
):
    """Execute a workflow manually."""
    # Verify workflow exists and belongs to user
    result = await db.execute(
        select(Workflow).where(
            Workflow.id == workflow_id,
            Workflow.user_id == user.id
        )
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    definition = workflow.definition or {}
    nodes = definition.get("nodes", [])
    requested_trigger = request.triggerNodeId
    trigger = next(
        (
            node for node in nodes
            if requested_trigger and requested_trigger in (node.get("id"), node.get("name"))
        ),
        None,
    ) if requested_trigger else next(
        (node for node in nodes if node.get("type") == "manualTrigger"), None
    )

    if trigger is None:
        raise HTTPException(status_code=422, detail="Aucun trigger manuel disponible")
    if trigger.get("type") != "manualTrigger":
        raise HTTPException(status_code=422, detail="Seul un trigger manuel peut démarrer une exécution manuelle")

    graph_errors = WorkflowGraph(definition).validate_workflow()
    if graph_errors:
        raise HTTPException(status_code=422, detail={"issues": graph_errors})

    initial_items = request.items
    if initial_items is None:
        test_data = (trigger.get("parameters") or {}).get("testData", {"text": "Bonjour"})
        # The request format is a list of items; accept either item envelopes or
        # plain JSON objects for compatibility with the existing API client.
        if isinstance(test_data, list):
            initial_items = [
                value if isinstance(value, dict) and "json" in value
                else {"json": value if isinstance(value, dict) else {"data": value}}
                for value in test_data
            ]
        elif isinstance(test_data, dict) and "json" in test_data:
            initial_items = [test_data]
        elif isinstance(test_data, dict):
            initial_items = [{"json": test_data}]
        else:
            raise HTTPException(status_code=422, detail="Les données de test doivent être un objet JSON ou une liste")

    try:
        execution_id = await executor.execute_workflow(
            workflow_id=workflow.id,
            user_id=user.id,
            trigger_node_id=trigger["name"],
            items=initial_items,
            mode="manual",
        )
    except ExecutionQueueFull as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    
    return ExecutionResponse(executionId=execution_id)


@router.get("/workflows/{workflow_id}/executions")
async def list_executions(
    workflow_id: str,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user)
):
    """List executions for a workflow."""
    # Verify workflow belongs to user
    result = await db.execute(
        select(Workflow).where(
            Workflow.id == workflow_id,
            Workflow.user_id == user.id
        )
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    if limit < 1 or limit > 100 or offset < 0:
        raise HTTPException(status_code=422, detail="La pagination demandée est invalide")

    result = await db.execute(
        select(Execution)
        .where(Execution.workflow_id == workflow_id, Execution.user_id == user.id)
        .order_by(desc(Execution.started_at))
        .offset(offset)
        .limit(limit)
    )
    executions = result.scalars().all()
    return {"executions": [_execution_summary(execution) for execution in executions]}


@router.get("/executions/{execution_id}")
async def get_execution(
    execution_id: str,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """Return execution metadata and node statuses without node payloads."""
    execution = await _owned_execution(db, execution_id, user.id)
    result = await db.execute(
        select(ExecutionNode).where(ExecutionNode.execution_id == execution.id)
    )
    return {
        **_execution_summary(execution),
        "nodes": [_node_summary(node) for node in result.scalars().all()],
    }


@router.get("/executions/{execution_id}/nodes/{node_id}")
async def get_execution_node(
    execution_id: str,
    node_id: str,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """Return persisted input/output/trace for one node in an owned execution."""
    execution = await _owned_execution(db, execution_id, user.id)
    result = await db.execute(
        select(ExecutionNode).where(
            ExecutionNode.execution_id == execution.id,
            ExecutionNode.node_id == node_id,
        )
    )
    node = result.scalar_one_or_none()
    if node is None:
        raise HTTPException(status_code=404, detail="Node d'exécution introuvable")
    return {
        "nodeId": node.node_id,
        "status": node.status,
        "input": node.input,
        "output": node.output,
        "error": node.error,
        "trace": node.trace,
        "outputCounts": node.output_counts,
        "startedAt": _iso(node.started_at),
        "finishedAt": _iso(node.finished_at),
    }


@router.get("/executions/{execution_id}/stream")
async def stream_execution_events(
    execution_id: str,
    last_event_id: Optional[str] = Header(default=None, alias="Last-Event-ID"),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """Replay persisted events, then continue with events emitted live."""
    execution = await _owned_execution(db, execution_id, user.id)
    after_seq = _parse_last_event_id(last_event_id, execution_id)
    emitter = get_event_emitter(execution_id)
    queue: asyncio.Queue = asyncio.Queue(maxsize=256)
    emitter.add_listener(queue)

    async def event_stream() -> AsyncIterator[str]:
        last_sent = after_seq
        try:
            # Subscribe before querying history. Any events emitted during the
            # query are buffered and de-duplicated by sequence number below.
            async with get_async_session_context() as session:
                result = await session.execute(
                    select(ExecutionEvent)
                    .where(
                        ExecutionEvent.execution_id == execution_id,
                        ExecutionEvent.seq > after_seq,
                    )
                    .order_by(ExecutionEvent.seq)
                )
                for event in result.scalars().all():
                    last_sent = event.seq
                    yield _format_sse(event.seq, event.type, event.payload)

            current = await _execution_status(execution_id)
            if current in ("success", "error", "cancelled"):
                return

            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15)
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
                    continue

                seq = event.get("seq", 0)
                if seq <= last_sent:
                    continue
                last_sent = seq
                yield _format_sse(seq, event["type"], event["payload"])
                if event["type"] in ("execution.finished", "execution:finish"):
                    return
        finally:
            emitter.remove_listener(queue)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _iso(value):
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def _execution_summary(execution: Execution) -> Dict[str, Any]:
    duration_ms = None
    if execution.started_at and execution.finished_at:
        start = execution.started_at
        finish = execution.finished_at
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if finish.tzinfo is None:
            finish = finish.replace(tzinfo=timezone.utc)
        duration_ms = max(0, int((finish - start).total_seconds() * 1000))
    return {
        "id": execution.id,
        "executionId": execution.id,
        "workflowId": execution.workflow_id,
        "mode": execution.mode,
        "status": execution.status,
        "startedAt": _iso(execution.started_at),
        "finishedAt": _iso(execution.finished_at),
        "durationMs": duration_ms,
        "error": execution.error,
    }


def _node_summary(node: ExecutionNode) -> Dict[str, Any]:
    duration_ms = None
    if node.started_at and node.finished_at:
        duration_ms = max(0, int((node.finished_at - node.started_at).total_seconds() * 1000))
    return {
        "nodeId": node.node_id,
        "status": node.status,
        "startedAt": _iso(node.started_at),
        "finishedAt": _iso(node.finished_at),
        "durationMs": duration_ms,
        "outputCounts": node.output_counts,
        "error": node.error,
    }


async def _owned_execution(db: AsyncSession, execution_id: str, user_id: str) -> Execution:
    result = await db.execute(
        select(Execution).where(
            Execution.id == execution_id,
            Execution.user_id == user_id,
        )
    )
    execution = result.scalar_one_or_none()
    if execution is None:
        raise HTTPException(status_code=404, detail="Exécution introuvable")
    return execution


def _parse_last_event_id(value: Optional[str], execution_id: str) -> int:
    if not value:
        return 0
    try:
        if "-" in value:
            event_execution_id, raw_seq = value.rsplit("-", 1)
            if event_execution_id != execution_id:
                return 0
            return max(0, int(raw_seq))
        return max(0, int(value))
    except ValueError:
        return 0


def _format_sse(seq: int, event_type: str, payload: Dict[str, Any]) -> str:
    event_name = {
        "execution.started": "execution:start",
        "execution.finished": "execution:finish",
        "node.started": "node:start",
        "node.success": "node:success",
        "node.error": "node:error",
        "node.skipped": "node:skipped",
    }.get(event_type, event_type.replace(".", ":"))
    data = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    return f"id: {seq}\nevent: {event_name}\ndata: {data}\n\n"


def get_async_session_context():
    """Create a standalone async session for a streaming response."""
    from ..db.database import AsyncSessionLocal
    return AsyncSessionLocal()


async def _execution_status(execution_id: str) -> Optional[str]:
    async with get_async_session_context() as session:
        result = await session.execute(select(Execution.status).where(Execution.id == execution_id))
        return result.scalar_one_or_none()
