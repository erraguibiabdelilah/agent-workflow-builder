"""Node type definitions and interfaces."""
import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Protocol, Union

from pydantic import BaseModel, ConfigDict, Field

# Import shared types from the shared package
# These will be available once we update the API client
from ..lib.errors import NodeError


class Item(BaseModel):
    """Data item passed between nodes."""
    data: Dict[str, Any] = Field(alias="json")
    
    class Config:
        populate_by_name = True  # Allow both 'data' and 'json' field names

    def get(self, key: str, default: Any = None) -> Any:
        """Offer mapping-style access used by the current node implementations."""
        if key == "json":
            return self.data
        return default


class ConnectionType:
    """Connection types between nodes."""
    MAIN = "main"
    AI_LANGUAGE_MODEL = "ai_languageModel"
    AI_MEMORY = "ai_memory"
    AI_TOOL = "ai_tool"


class NodeKind:
    """Node kinds."""
    TRIGGER = "trigger"
    REGULAR = "regular"
    SUBNODE = "subnode"


class NodeCategory:
    """Node categories."""
    TRIGGER = "trigger"
    AI = "ai"
    LOGIC = "logic"
    ACTION = "action"
    TOOL = "tool"
    MODEL = "model"
    MEMORY = "memory"


class PropertyType:
    """Property types for node configuration."""
    STRING = "string"
    TEXT = "text"
    NUMBER = "number"
    BOOLEAN = "boolean"
    OPTIONS = "options"
    JSON = "json"
    CREDENTIAL = "credential"
    LIST = "list"


def _to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class NodeSchema(BaseModel):
    """Schema base that accepts Python names and emits the frontend camelCase contract."""

    model_config = ConfigDict(
        alias_generator=_to_camel,
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )


class InputPort(NodeSchema):
    """Node input port definition."""
    type: str
    display_name: Optional[str] = None
    required: bool = False
    max_connections: Optional[int] = None


class OutputPort(NodeSchema):
    """Node output port definition."""
    type: str
    display_name: Optional[str] = None


class NodeProperty(NodeSchema):
    """Node property definition."""
    name: str
    display_name: str
    type: str
    default: Optional[Any] = None
    required: bool = False
    description: Optional[str] = None
    placeholder: Optional[str] = None
    options: Optional[List[Dict[str, str]]] = None
    supports_expressions: bool = False
    credential_type: Optional[str] = None
    item_fields: Optional[List["NodeProperty"]] = None
    show_when: Optional[Dict[str, Any]] = None
    min: Optional[float] = None
    max: Optional[float] = None

class NodeTypeDescription(NodeSchema):
    """Complete node type description for the frontend."""
    type: str
    version: int
    display_name: str
    description: str
    category: str
    kind: str
    icon: str
    subtitle: Optional[str] = None
    color: Optional[str] = None
    inputs: List[InputPort]
    outputs: List[OutputPort]
    properties: List[NodeProperty]
    credentials: Optional[List[Dict[str, Union[str, bool]]]] = None


class SubNodeHandle(BaseModel):
    """Handle to a resolved sub-node."""
    node_id: str
    node_name: str
    value: Any


class BaseContext(BaseModel):
    """Base context for node execution."""
    workflow: Dict[str, Any]
    node: Dict[str, Any]
    execution_id: str
    user_id: str
    logger: Optional[logging.Logger] = None
    
    class Config:
        arbitrary_types_allowed = True
    
    def get_param(self, name: str, item_index: int = 0) -> Any:
        """Get parameter value with expression resolution."""
        value = self.node.get("parameters", {}).get(name)
        # TODO: Implement expression resolution
        return value
    
    async def get_credential(self, credential_type: str) -> Dict[str, str]:
        """Get decrypted credential."""
        # TODO: Implement credential decryption
        return {}


class ExecuteContext(BaseContext):
    """Context for node execution."""
    items: List[Item]
    
    async def get_sub_nodes(self, connection_type: str) -> List[SubNodeHandle]:
        """Resolve connected sub-nodes."""
        # TODO: Implement sub-node resolution
        return []


class SupplyContext(BaseContext):
    """Context for sub-node supply."""
    vars: Optional[Dict[str, Any]] = None


class TriggerState(Protocol):
    """Trigger state interface."""
    
    async def get(self) -> Optional[Any]:
        """Get trigger state."""
        ...
    
    async def set(self, value: Any) -> None:
        """Set trigger state."""
        ...


class TriggerContext(BaseContext):
    """Context for trigger activation."""
    # Don't include the state field directly in the model
    
    def __init__(self, **data):
        # Extract state if present before calling super().__init__
        state = data.pop('state', None)
        super().__init__(**data)
        self._state = state
    
    @property
    def state(self):
        """Get trigger state."""
        return self._state
    
    async def emit(self, items: List[Item]) -> None:
        """Emit items to start workflow execution."""
        # TODO: Implement workflow execution trigger
        pass


class TriggerHandle:
    """Handle for active trigger."""
    
    def __init__(self, stop_func):
        self._stop_func = stop_func
    
    async def stop(self) -> None:
        """Stop the trigger."""
        if self._stop_func:
            await self._stop_func()


class NodeDefinition(ABC):
    """Base class for node definitions."""
    
    @property
    @abstractmethod
    def description(self) -> NodeTypeDescription:
        """Node type description."""
        pass
    
    async def execute(self, ctx: ExecuteContext) -> List[List[Item]]:
        """Execute node with input items."""
        raise NotImplementedError("Node does not support execution")
    
    async def supply(self, ctx: SupplyContext) -> Any:
        """Supply sub-node value."""
        raise NotImplementedError("Node does not support supply")
    
    async def activate(self, ctx: TriggerContext) -> TriggerHandle:
        """Activate trigger."""
        raise NotImplementedError("Node does not support activation")
