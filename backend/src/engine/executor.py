"""Workflow execution engine."""
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Set
from sqlalchemy import select

from ..db.database import AsyncSessionLocal as get_db
from ..db.models import Execution, ExecutionNode, Workflow
from ..nodes.registry import get_node_definition, get_node_kind
from ..lib.errors import NodeError, ExecutionError
from .events import ExecutionEventEmitter, get_event_emitter
from .graph import WorkflowGraph, NodeExecution
from .context import create_execute_context


class ExecutionQueueFull(Exception):
    """Raised when a workflow already has one run and twenty queued runs."""


class WorkflowExecutor:
    """Executes workflows with proper error handling and event emission."""
    
    def __init__(self):
        self.active_executions: Dict[str, asyncio.Task] = {}
        self.workflow_locks: Dict[str, asyncio.Lock] = {}
        self.workflow_pending: Dict[str, int] = {}
        
    async def execute_workflow(
        self,
        workflow_id: str,
        user_id: str,
        trigger_node_id: Optional[str] = None,
        items: Optional[List[Dict[str, Any]]] = None,
        mode: str = "manual"
    ) -> str:
        """
        Execute a workflow and return the execution ID.
        """
        execution_id = str(uuid.uuid4())

        # One active execution plus at most twenty waiting executions per workflow.
        pending = self.workflow_pending.get(workflow_id, 0)
        if pending >= 21:
            raise ExecutionQueueFull("La file de ce workflow est pleine")
        self.workflow_pending[workflow_id] = pending + 1
        
        # Create execution record
        try:
            async with get_db() as db:
                execution = Execution(
                    id=execution_id,
                    workflow_id=workflow_id,
                    user_id=user_id,
                    mode=mode,
                    status="running",
                    started_at=datetime.now(timezone.utc)
                )
                db.add(execution)
                await db.commit()
        except Exception:
            self.workflow_pending[workflow_id] = max(0, self.workflow_pending.get(workflow_id, 1) - 1)
            raise
        
        # Start execution in background
        task = asyncio.create_task(
            self._run_serialized(execution_id, workflow_id, user_id, trigger_node_id, items)
        )
        self.active_executions[execution_id] = task
        
        # Clean up when done
        def cleanup(task: asyncio.Task):
            self.active_executions.pop(execution_id, None)
            self.workflow_pending[workflow_id] = max(0, self.workflow_pending.get(workflow_id, 1) - 1)
            if self.workflow_pending[workflow_id] == 0:
                self.workflow_pending.pop(workflow_id, None)
                self.workflow_locks.pop(workflow_id, None)
        task.add_done_callback(cleanup)
        
        return execution_id

    async def _run_serialized(self, execution_id, workflow_id, user_id, trigger_node_id, items):
        lock = self.workflow_locks.setdefault(workflow_id, asyncio.Lock())
        async with lock:
            await self._execute_workflow_impl(
                execution_id, workflow_id, user_id, trigger_node_id, items
            )
        
    async def _execute_workflow_impl(
        self,
        execution_id: str,
        workflow_id: str,
        user_id: str,
        trigger_node_id: Optional[str] = None,
        items: Optional[List[Dict[str, Any]]] = None
    ):
        """Internal workflow execution implementation."""
        emitter = get_event_emitter(execution_id)
        
        try:
            # Load workflow from database
            async with get_db() as db:
                result = await db.execute(
                    select(Workflow).where(
                        Workflow.id == workflow_id,
                        Workflow.user_id == user_id,
                    )
                )
                workflow = result.scalar_one_or_none()
                if not workflow:
                    raise ExecutionError(f"Workflow {workflow_id} not found")
            
            # Parse workflow definition
            definition = workflow.definition
            graph = WorkflowGraph(definition)
            
            # Emit start event
            await emitter.emit_execution_started(workflow_id, trigger_node_id)
            
            # Determine starting nodes
            if trigger_node_id:
                start_nodes = [trigger_node_id]
                initial_items = items or [{"json": {}}]
            else:
                # Find manual trigger nodes
                start_nodes = graph.get_trigger_nodes()
                initial_items = [{"json": {}}]
            
            # Execute workflow graph
            await self._execute_graph(
                graph, start_nodes, initial_items, execution_id, 
                workflow_id, user_id, emitter
            )
            
            # Mark execution as successful
            async with get_db() as db:
                execution = await db.get(Execution, execution_id)
                if execution:
                    execution.status = "success"
                    execution.finished_at = datetime.now(timezone.utc)
                    await db.commit()
            
            await emitter.emit_execution_finished("success")
            
        except Exception as e:
            # Mark execution as failed
            async with get_db() as db:
                execution = await db.get(Execution, execution_id)
                if execution:
                    execution.status = "error"
                    execution.finished_at = datetime.now(timezone.utc)
                    execution.error = {
                        "type": "execution",
                        "message": str(e),
                    }
                    await db.commit()
            
            await emitter.emit_execution_finished("error", str(e))
            
    async def _execute_graph(
        self,
        graph: WorkflowGraph,
        start_nodes: List[str],
        initial_items: List[Dict[str, Any]],
        execution_id: str,
        workflow_id: str,
        user_id: str,
        emitter: ExecutionEventEmitter
    ):
        """Execute the workflow graph starting from given nodes."""
        # Track node execution state
        node_outputs: Dict[str, List[List[Dict[str, Any]]]] = {}
        executed_nodes: Set[str] = set()
        
        # Initialize with start nodes
        pending_executions = []
        for node_id in start_nodes:
            pending_executions.append(NodeExecution(
                node_id=node_id,
                input_data=initial_items,
                connection_type="main",
                connection_index=0
            ))
        
        # Execute nodes in dependency order
        while pending_executions:
            current_executions = pending_executions[:]
            pending_executions = []
            
            for node_exec in current_executions:
                try:
                    # Execute single node
                    outputs = await self._execute_node(
                        graph, node_exec, execution_id, workflow_id, 
                        user_id, emitter, node_outputs
                    )
                    
                    # Store outputs
                    node_outputs[node_exec.node_id] = outputs
                    executed_nodes.add(node_exec.node_id)
                    
                    # Queue dependent nodes
                    dependents = graph.get_dependent_executions(node_exec.node_id, outputs)
                    pending_executions.extend(dependents)
                    
                except NodeError as e:
                    # Handle node-specific errors
                    failed_node = graph.get_node(node_exec.node_id)
                    source_node_id = e.source_node_id
                    if source_node_id and source_node_id != failed_node.get("id", node_exec.node_id):
                        await emitter.emit_node_error(source_node_id, e)
                    await emitter.emit_node_error(failed_node.get("id", node_exec.node_id), e)
                    
                    # Check if we should continue or stop
                    node = graph.get_node(node_exec.node_id)
                    if node.get("onError") != "continue":
                        raise ExecutionError(f"Node {node_exec.node_id} failed: {e}")
                    
                except Exception as e:
                    await emitter.emit_node_error(
                        node_exec.node_id, 
                        NodeError(f"Unexpected error: {e}", "unknown")
                    )
                    raise
    
    async def _execute_node(
        self,
        graph: WorkflowGraph,
        node_exec: NodeExecution,
        execution_id: str,
        workflow_id: str,
        user_id: str,
        emitter: ExecutionEventEmitter,
        node_outputs: Dict[str, List[List[Dict[str, Any]]]]
    ) -> List[List[Dict[str, Any]]]:
        """Execute a single node."""
        node = graph.get_node(node_exec.node_id)
        node_def = get_node_definition(node["type"])
        
        if not node_def:
            raise NodeError(f"Unknown node type: {node['type']}", "config")
        
        # Skip subnodes - they are handled by their parent nodes
        if get_node_kind(node_def) == "subnode":
            return [[]]
        
        # Emit node started event
        persisted_node_id = node.get("id", node_exec.node_id)
        node_started = datetime.now(timezone.utc)
        await self._persist_node(
            execution_id,
            persisted_node_id,
            status="running",
            started_at=node_started,
            input_data=node_exec.input_data,
        )
        await emitter.emit_node_started(persisted_node_id)
        
        try:
            # Create execution context
            context = create_execute_context(
                workflow=graph.workflow,
                node=node,
                execution_id=execution_id,
                user_id=user_id,
                items=node_exec.input_data,
                node_outputs=node_outputs
            )

            subnode_started_at: Dict[str, datetime] = {}

            async def report_subnode(node_id: str, status: str, error: Optional[NodeError] = None):
                now = datetime.now(timezone.utc)
                if status == "running":
                    subnode_started_at[node_id] = now
                    await self._persist_node(
                        execution_id, node_id, status="running", started_at=now
                    )
                    await emitter.emit_node_started(node_id)
                    return
                started_at = subnode_started_at.get(node_id, now)
                if status == "error":
                    node_error = error or NodeError("L’outil a échoué.", "tool")
                    await self._persist_node(
                        execution_id, node_id, status="error", started_at=started_at,
                        finished_at=now, error=node_error.to_dict(),
                    )
                    await emitter.emit_node_error(node_id, node_error)
                    return
                await self._persist_node(
                    execution_id, node_id, status="success", started_at=started_at,
                    finished_at=now, output_data=[[]], output_counts=[0],
                )
                await emitter.emit_node_success(node_id, [[]])

            context.subnode_reporter = report_subnode
            
            # Execute the node
            if hasattr(node_def, 'execute') and callable(node_def.execute):
                outputs = await node_def.execute(context)
            else:
                # Default passthrough for nodes without execute method
                outputs = [node_exec.input_data]

            # Any connected sub-node used without an explicit error completed
            # successfully along with its parent agent.
            for subnode_id, status in list(context.subnode_statuses.items()):
                if status == "running":
                    await context.report_subnode_status(subnode_id, "success")

            outputs = [
                [
                    item.model_dump(by_alias=True) if hasattr(item, "model_dump")
                    else item.dict(by_alias=True) if hasattr(item, "dict")
                    else item
                    for item in output
                ]
                for output in outputs
            ]
            
            # Emit node success event
            finished_at = datetime.now(timezone.utc)
            await self._persist_node(
                execution_id,
                persisted_node_id,
                status="success",
                started_at=node_started,
                finished_at=finished_at,
                input_data=node_exec.input_data,
                output_data=outputs,
                output_counts=[len(output) for output in outputs],
                trace=context.trace,
            )
            await emitter.emit_node_success(persisted_node_id, outputs)
            
            return outputs
            
        except Exception as e:
            error = e if isinstance(e, NodeError) else NodeError(f"Node execution failed: {e}", "unknown")
            await self._persist_node(
                execution_id,
                persisted_node_id,
                status="error",
                started_at=node_started,
                finished_at=datetime.now(timezone.utc),
                input_data=node_exec.input_data,
                error=error.to_dict(),
                trace=context.trace,
            )
            raise error

    async def _persist_node(
        self,
        execution_id: str,
        node_id: str,
        status: str,
        started_at: datetime,
        finished_at: Optional[datetime] = None,
        input_data: Optional[Any] = None,
        output_data: Optional[Any] = None,
        error: Optional[Any] = None,
        output_counts: Optional[List[int]] = None,
        trace: Optional[Any] = None,
    ) -> None:
        """Persist node state before the corresponding terminal event is emitted."""
        async with get_db() as db:
            result = await db.execute(
                select(ExecutionNode).where(
                    ExecutionNode.execution_id == execution_id,
                    ExecutionNode.node_id == node_id,
                )
            )
            record = result.scalar_one_or_none()
            if record is None:
                record = ExecutionNode(execution_id=execution_id, node_id=node_id, status=status)
                db.add(record)
            record.status = status
            record.started_at = started_at
            record.finished_at = finished_at
            record.input = input_data
            record.output = output_data
            record.error = error
            record.output_counts = output_counts
            record.trace = trace
            await db.commit()

# Global executor instance
executor = WorkflowExecutor()
