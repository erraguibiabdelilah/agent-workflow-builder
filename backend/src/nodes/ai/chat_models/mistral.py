"""Mistral chat model node description and implementation stub."""
from ...types import (
    ConnectionType,
    NodeCategory,
    NodeDefinition,
    NodeKind,
    NodeProperty,
    NodeTypeDescription,
    OutputPort,
    PropertyType,
    SupplyContext,
)
from ....lib.errors import NodeError, NodeErrorType


class MistralChatModelNode(NodeDefinition):
    @property
    def description(self) -> NodeTypeDescription:
        return NodeTypeDescription(
            type="chatModelMistral",
            version=1,
            display_name="Mistral AI",
            description="Modèles de langage de Mistral AI",
            category=NodeCategory.MODEL,
            kind=NodeKind.SUBNODE,
            icon="mistral",
            color="var(--text)",
            inputs=[],
            outputs=[OutputPort(type=ConnectionType.AI_LANGUAGE_MODEL, display_name="Model")],
            properties=[
                NodeProperty(
                    name="model",
                    display_name="Modèle",
                    type=PropertyType.OPTIONS,
                    default="custom",
                    required=True,
                    options=[{"value": "custom", "label": "Autre (ID personnalisé)"}],
                ),
                NodeProperty(
                    name="customModel",
                    display_name="ID du modèle",
                    type=PropertyType.STRING,
                    required=True,
                    show_when={"property": "model", "equals": "custom"},
                    placeholder="mistral-model-id",
                ),
                NodeProperty(name="temperature", display_name="Température", type=PropertyType.NUMBER, default=0.7, min=0, max=2),
                NodeProperty(name="maxTokens", display_name="Tokens max", type=PropertyType.NUMBER, default=1024, min=1),
            ],
            credentials=[{"type": "mistralApi", "required": True}],
        )

    async def supply(self, ctx: SupplyContext):
        raise NodeError("Non implémenté", NodeErrorType.CONFIG)


mistral_chat_model_node = MistralChatModelNode()
