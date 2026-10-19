"""Anthropic Claude chat model node."""
from ...types import (
    NodeDefinition,
    NodeTypeDescription,
    NodeCategory,
    NodeKind,
    PropertyType,
    OutputPort,
    ConnectionType,
    NodeProperty,
    SupplyContext,
)
from ....lib.errors import NodeError, NodeErrorType


class AnthropicChatModelNode(NodeDefinition):
    """Anthropic Claude chat model."""
    
    @property
    def description(self) -> NodeTypeDescription:
        return NodeTypeDescription(
            type="chatModelAnthropic",
            version=1,
            display_name="Anthropic Claude",
            description="Modèle Claude d'Anthropic",
            category=NodeCategory.MODEL,
            kind=NodeKind.SUBNODE,
            icon="anthropic",
            color="var(--text)",
            inputs=[],
            outputs=[OutputPort(type=ConnectionType.AI_LANGUAGE_MODEL, display_name="Model")],
            properties=[
                NodeProperty(
                    name="model",
                    display_name="Modèle",
                    type=PropertyType.OPTIONS,
                    default="claude-3-haiku-20240307",
                    required=True,
                    options=[
                        {"value": "claude-3-haiku-20240307", "label": "Claude 3 Haiku"},
                        {"value": "claude-3-sonnet-20240229", "label": "Claude 3 Sonnet"},
                        {"value": "claude-3-opus-20240229", "label": "Claude 3 Opus"},
                        {"value": "custom", "label": "Autre (ID personnalisé)"},
                    ],
                ),
                NodeProperty(
                    name="customModel",
                    display_name="ID du modèle",
                    type=PropertyType.STRING,
                    required=True,
                    show_when={"property": "model", "equals": "custom"},
                    placeholder="claude-model-id",
                ),
                NodeProperty(
                    name="temperature",
                    display_name="Température",
                    type=PropertyType.NUMBER,
                    default=0.7,
                    min=0.0,
                    max=1.0,
                    description="Contrôle la créativité du modèle",
                ),
                NodeProperty(
                    name="maxTokens",
                    display_name="Tokens max",
                    type=PropertyType.NUMBER,
                    default=1024,
                    min=1,
                    max=4096,
                    description="Nombre maximum de tokens générés",
                ),
            ],
            credentials=[
                {"type": "anthropicApi", "required": True}
            ],
        )
    
    async def supply(self, ctx: SupplyContext) -> dict:
        """Model construction is implemented by the AI agents spec."""
        raise NodeError("Non implémenté", NodeErrorType.CONFIG)


# Export the node
anthropic_chat_model_node = AnthropicChatModelNode()
