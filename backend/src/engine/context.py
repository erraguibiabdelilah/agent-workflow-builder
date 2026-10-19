"""Execution context creation for nodes."""
import re
import json
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass

from ..nodes.registry import get_node_definition
from ..lib.errors import NodeError
from .expressions import resolve_expressions

@dataclass
class BaseContext:
    """Base execution context for all node types."""
    workflow: Dict[str, Any]
    node: Dict[str, Any]
    execution_id: str
    user_id: str
    # signal: AbortSignal  # TODO: Implement abort signals
    # logger: Logger  # TODO: Implement logging
    
    def get_param(self, name: str, item_index: int = 0):
        """Get parameter value with expressions resolved for given item index."""
        param_value = self.node.get("parameters", {}).get(name)
        if param_value is None:
            return None
        
        # If it's a simple value, return as-is
        if not isinstance(param_value, str):
            return param_value
        
        # Resolve expressions
        context_vars = self._get_expression_context(item_index)
        return resolve_expressions(param_value, context_vars)
    
    async def get_credential(self, credential_type: str) -> Dict[str, str]:
        """Get decrypted credential - server only, never returned or persisted."""
        credentials = self.node.get("credentials") or {}
        credential_id = next(
            (
                value
                for key, value in credentials.items()
                if key.casefold() == credential_type.casefold()
            ),
            None,
        )
        if not credential_id:
            from ..lib.errors import NodeError, NodeErrorType

            raise NodeError(
                "Credential OpenAI manquant. Sélectionnez une clé API dans le node OpenAI GPT.",
                NodeErrorType.CONFIG,
                source_node_id=self.node.get("id"),
            )

        from sqlalchemy import select

        from ..credentials.crypto import decrypt_credential_data
        from ..db.database import AsyncSessionLocal
        from ..db.models import Credential
        from ..lib.errors import NodeError, NodeErrorType

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Credential).where(
                    Credential.id == credential_id,
                    Credential.user_id == self.user_id,
                )
            )
            credential = result.scalar_one_or_none()

        if credential is None or credential.type.casefold() != credential_type.casefold():
            raise NodeError(
                "Le credential OpenAI sélectionné est introuvable ou incompatible.",
                NodeErrorType.CONFIG,
                source_node_id=self.node.get("id"),
            )

        try:
            return decrypt_credential_data(credential.encrypted_data)
        except Exception as error:
            raise NodeError(
                "Impossible de déchiffrer le credential OpenAI. Vérifiez la configuration du serveur.",
                NodeErrorType.CONFIG,
                source_node_id=self.node.get("id"),
                cause=error,
            ) from error
    
    def _get_expression_context(self, item_index: int = 0) -> Dict[str, Any]:
        """Get context variables for expression resolution."""
        context = {
            "$json": {},  # Current item data
            "$node": {},  # Other node outputs
            "$env": {},   # Environment variables
            "$now": {},   # Current date/time
        }
        
        # Add current item if available
        if hasattr(self, 'items') and self.items and item_index < len(self.items):
            context["$json"] = self.items[item_index].get("json", {})
        
        # Add node outputs if available
        if hasattr(self, 'node_outputs'):
            node_context = {}
            for node_name, outputs in self.node_outputs.items():
                if outputs and outputs[0]:  # Take first output
                    node_context[node_name] = outputs[0][0] if outputs[0] else {}
            context["$node"] = node_context
        
        return context

class ExecuteContext(BaseContext):
    """Execution context for regular and trigger nodes."""
    
    def __init__(self, items: List[Dict[str, Any]], node_outputs: Dict[str, Any], **kwargs):
        super().__init__(**kwargs)
        self.items = items
        self.node_outputs = node_outputs
        self.subnode_reporter: Optional[Callable[..., Any]] = None
        self.subnode_statuses: Dict[str, str] = {}
        self.trace: Any = None

    async def report_subnode_status(self, node_id: str, status: str, error: Optional[NodeError] = None):
        """Persist and emit a state change for a connected AI sub-node."""
        current = self.subnode_statuses.get(node_id)
        if current == "error" and status == "success":
            return
        self.subnode_statuses[node_id] = status
        if self.subnode_reporter:
            await self.subnode_reporter(node_id, status, error)
    
    async def get_sub_nodes(self, connection_type: str, item_index: int = 0):
        """Resolve connected sub-nodes by calling their supply() method."""
        from .graph import WorkflowGraph
        
        graph = WorkflowGraph(self.workflow)
        subnode_names = graph.get_connected_subnodes(self.node["name"], connection_type)
        
        handles = []
        for subnode_name in subnode_names:
            subnode = graph.get_node(subnode_name)
            subnode_def = get_node_definition(subnode["type"])
            
            if subnode_def and hasattr(subnode_def, 'supply'):
                # Create supply context for subnode
                supply_ctx = SupplyContext(
                    workflow=self.workflow,
                    node=subnode,
                    execution_id=self.execution_id,
                    user_id=self.user_id,
                    vars={
                        "$json": (
                            self.items[item_index].get("json", {})
                            if 0 <= item_index < len(self.items)
                            and isinstance(self.items[item_index], dict)
                            else {}
                        )
                    },
                )

                node_id = str(subnode.get("id", subnode_name))
                await self.report_subnode_status(node_id, "running")
                try:
                    value = await subnode_def.supply(supply_ctx)
                except NodeError as error:
                    await self.report_subnode_status(node_id, "error", error)
                    if error.source_node_id is None:
                        error.source_node_id = node_id
                    raise
                except Exception as error:
                    wrapped = NodeError(
                        "Impossible d’initialiser un sous-node IA.",
                        "config",
                        source_node_id=node_id,
                        cause=error,
                    )
                    await self.report_subnode_status(node_id, "error", wrapped)
                    raise wrapped from error
                
                handles.append({
                    "nodeId": subnode["id"],
                    "nodeName": subnode["name"],
                    "value": value
                })
        
        return handles

class SupplyContext(BaseContext):
    """Supply context for sub-nodes."""
    
    def __init__(self, vars: Optional[Dict[str, Any]] = None, **kwargs):
        super().__init__(**kwargs)
        self.vars = vars or {}
    
    def _get_expression_context(self, item_index: int = 0) -> Dict[str, Any]:
        """Get context variables including custom vars."""
        context = super()._get_expression_context(item_index)
        context.update(self.vars)
        return context

class TriggerContext(BaseContext):
    """Trigger context for listening triggers."""
    
    def __init__(self, emit_callback: Callable, state_manager, **kwargs):
        super().__init__(**kwargs)
        self._emit_callback = emit_callback
        self._state_manager = state_manager
    
    async def emit(self, items: List[Dict[str, Any]]):
        """Call on each event to launch workflow execution."""
        await self._emit_callback(items)
    
    @property
    def state(self):
        """Persistent trigger state manager."""
        return self._state_manager

def create_execute_context(
    workflow: Dict[str, Any],
    node: Dict[str, Any],
    execution_id: str,
    user_id: str,
    items: List[Dict[str, Any]],
    node_outputs: Dict[str, Any]
) -> ExecuteContext:
    """Create an execution context for a node."""
    return ExecuteContext(
        workflow=workflow,
        node=node,
        execution_id=execution_id,
        user_id=user_id,
        items=items,
        node_outputs=node_outputs
    )

def create_supply_context(
    workflow: Dict[str, Any],
    node: Dict[str, Any],
    execution_id: str,
    user_id: str,
    vars: Optional[Dict[str, Any]] = None
) -> SupplyContext:
    """Create a supply context for a sub-node."""
    return SupplyContext(
        workflow=workflow,
        node=node,
        execution_id=execution_id,
        user_id=user_id,
        vars=vars
    )

def create_trigger_context(
    workflow: Dict[str, Any],
    node: Dict[str, Any],
    execution_id: str,
    user_id: str,
    emit_callback: Callable,
    state_manager
) -> TriggerContext:
    """Create a trigger context for a listening trigger."""
    return TriggerContext(
        workflow=workflow,
        node=node,
        execution_id=execution_id,
        user_id=user_id,
        emit_callback=emit_callback,
        state_manager=state_manager
    )
