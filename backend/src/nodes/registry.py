"""Node registry - central list of all available nodes."""
from typing import Dict, List

from .types import NodeDefinition, NodeTypeDescription

# Import all node definitions
from .triggers.manual import manual_trigger_node
from .ai.agent import agent_node
from .ai.chat_models.anthropic import anthropic_chat_model_node
from .ai.chat_models.openai import openai_chat_model_node
from .ai.chat_models.google import google_chat_model_node
from .ai.chat_models.mistral import mistral_chat_model_node
from .ai.memory.window_memory import window_memory_node
from .ai.tools.http_tool import http_tool_node
from .ai.tools.calculator_tool import calculator_tool_node
from .core.set import set_node
from .core.if_node import if_node
from .core.http_request import http_request_node


class NodeRegistry:
    """Central registry for all node types."""
    
    def __init__(self):
        self._nodes: Dict[str, NodeDefinition] = {}
        self._register_all_nodes()
    
    def _register_all_nodes(self):
        """Register all available nodes."""
        nodes = [
            # Triggers
            manual_trigger_node,
            
            # AI Nodes
            agent_node,
            
            # Chat Models
            anthropic_chat_model_node,
            openai_chat_model_node,
            google_chat_model_node,
            mistral_chat_model_node,
            window_memory_node,
            http_tool_node,
            calculator_tool_node,
            
            # Core Nodes
            set_node,
            if_node,
            http_request_node,
        ]
        
        for node in nodes:
            description = node.description
            node_type = description.type if isinstance(description, NodeTypeDescription) else description["type"]
            if node_type in self._nodes:
                raise ValueError(f"Duplicate node type registered: {node_type}")
            self._nodes[node_type] = node
    
    def get_node(self, node_type: str) -> NodeDefinition:
        """Get node definition by type."""
        if node_type not in self._nodes:
            raise ValueError(f"Unknown node type: {node_type}")
        return self._nodes[node_type]
    
    def get_all_descriptions(self) -> List[NodeTypeDescription]:
        """Get all node type descriptions for the frontend."""
        descriptions = []
        for node in self._nodes.values():
            description = node.description
            if isinstance(description, NodeTypeDescription):
                descriptions.append(description)
            else:
                descriptions.append(NodeTypeDescription.model_validate(description))
        return descriptions
    
    def list_types(self) -> List[str]:
        """List all available node types."""
        return list(self._nodes.keys())


# Global registry instance
node_registry = NodeRegistry()

def get_node_definition(node_type: str) -> NodeDefinition:
    """Get node definition by type - convenience function."""
    return node_registry.get_node(node_type)

def get_node_kind(node: NodeDefinition) -> str | None:
    """Return a node's kind for both typed and legacy dictionary descriptions."""
    description = node.description
    if isinstance(description, dict):
        return description.get("kind")
    return getattr(description, "kind", None)

def get_all_node_descriptions() -> List[NodeTypeDescription]:
    """Get all node descriptions - convenience function."""
    return node_registry.get_all_descriptions()
