"""Execution event emission for Server-Sent Events (SSE)."""
import json
import asyncio
from typing import Dict, List, Any, Optional, Set
from datetime import datetime, timezone

from ..db.database import AsyncSessionLocal as get_db
from ..db.models import ExecutionEvent
from ..lib.errors import NodeError

class ExecutionEventEmitter:
    """Emits execution events and stores them for SSE streaming."""
    
    def __init__(self, execution_id: str):
        self.execution_id = execution_id
        self.sequence = 0
        self._listeners: Set[asyncio.Queue] = set()
    
    def add_listener(self, queue: asyncio.Queue):
        """Add a listener queue for real-time events."""
        self._listeners.add(queue)
    
    def remove_listener(self, queue: asyncio.Queue):
        """Remove a listener queue."""
        self._listeners.discard(queue)
    
    async def _emit_event(self, event_type: str, payload: Dict[str, Any]):
        """Emit an event to all listeners and store in database."""
        self.sequence += 1
        
        event_data = {
            "id": f"{self.execution_id}-{self.sequence}",
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Store in database
        async with get_db() as db:
            db_event = ExecutionEvent(
                execution_id=self.execution_id,
                seq=self.sequence,
                type=event_type,
                payload=payload
            )
            db.add(db_event)
            await db.commit()
        
        # Emit to listeners
        for queue in list(self._listeners):
            try:
                queue.put_nowait({**event_data, "seq": self.sequence})
            except asyncio.QueueFull:
                # Remove full queues
                self._listeners.discard(queue)
            except Exception:
                self._listeners.discard(queue)
    
    async def emit_execution_started(self, workflow_id: str, trigger_node_id: Optional[str] = None):
        """Emit execution started event."""
        await self._emit_event("execution.started", {
            "executionId": self.execution_id,
            "workflowId": workflow_id,
            "startedAt": datetime.now(timezone.utc).isoformat(),
        })
    
    async def emit_execution_finished(self, status: str, error: Optional[str] = None):
        """Emit execution finished event."""
        payload = {
            "executionId": self.execution_id,
            "status": status,
            "finishedAt": datetime.now(timezone.utc).isoformat(),
        }
        if error:
            payload["error"] = {"message": error, "type": "unknown"}
        await self._emit_event("execution.finished", payload)
    
    async def emit_node_started(self, node_id: str):
        """Emit node execution started event."""
        await self._emit_event("node.started", {
            "executionId": self.execution_id,
            "nodeId": node_id,
            "startedAt": datetime.now(timezone.utc).isoformat(),
        })
    
    async def emit_node_success(self, node_id: str, outputs: List[List[Dict[str, Any]]], duration_ms: int = 0):
        """Emit node execution success event."""
        # Calculate output counts
        output_counts = [len(output) for output in outputs]
        
        await self._emit_event("node.success", {
            "executionId": self.execution_id,
            "nodeId": node_id,
            "durationMs": duration_ms,
            "outputCounts": output_counts,
        })
    
    async def emit_node_error(self, node_id: str, error: NodeError):
        """Emit node execution error event."""
        await self._emit_event("node.error", {
            "executionId": self.execution_id,
            "nodeId": node_id,
            "durationMs": 0,
            "error": {
                "type": error.type,
                "message": error.message,
                "sourceNodeId": error.source_node_id
            }
        })
    
    async def emit_node_skipped(self, node_id: str, reason: str):
        """Emit node skipped event."""
        await self._emit_event("node.skipped", {
            "executionId": self.execution_id,
            "nodeId": node_id,
        })

# Global registry of active event emitters
_active_emitters: Dict[str, ExecutionEventEmitter] = {}

def get_event_emitter(execution_id: str) -> ExecutionEventEmitter:
    """Get or create an event emitter for an execution."""
    if execution_id not in _active_emitters:
        _active_emitters[execution_id] = ExecutionEventEmitter(execution_id)
    return _active_emitters[execution_id]

def cleanup_emitter(execution_id: str):
    """Clean up an event emitter when execution is done."""
    _active_emitters.pop(execution_id, None)
