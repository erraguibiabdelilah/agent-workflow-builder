"""OpenAI GPT chat model node."""
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


class OpenAIChatModelNode(NodeDefinition):
    """OpenAI GPT chat model."""
    
    @property
    def description(self) -> NodeTypeDescription:
        return NodeTypeDescription(
            type="chatModelOpenAI",
            version=1,
            display_name="OpenAI GPT",
            description="Modèles GPT d'OpenAI",
            category=NodeCategory.MODEL,
            kind=NodeKind.SUBNODE,
            icon="openai",
            color="var(--text)",
            inputs=[],
            outputs=[OutputPort(type=ConnectionType.AI_LANGUAGE_MODEL, display_name="Model")],
            properties=[
                NodeProperty(
                    name="model",
                    display_name="Modèle",
                    type=PropertyType.OPTIONS,
                    default="gpt-3.5-turbo",
                    required=True,
                    options=[
                        {"value": "gpt-3.5-turbo", "label": "GPT-3.5 Turbo"},
                        {"value": "gpt-4", "label": "GPT-4"},
                        {"value": "gpt-4-turbo", "label": "GPT-4 Turbo"},
                        {"value": "gpt-4o", "label": "GPT-4o"},
                        {"value": "custom", "label": "Autre (ID personnalisé)"},
                    ],
                ),
                NodeProperty(
                    name="customModel",
                    display_name="ID du modèle",
                    type=PropertyType.STRING,
                    required=True,
                    show_when={"property": "model", "equals": "custom"},
                    placeholder="model-id",
                ),
                NodeProperty(
                    name="temperature",
                    display_name="Température",
                    type=PropertyType.NUMBER,
                    default=0.7,
                    min=0.0,
                    max=2.0,
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
                {"type": "openaiApi", "required": True}
            ],
        )
    
    async def supply(self, ctx: SupplyContext) -> dict:
        """Build an OpenAI chat model handle for the connected Agent node."""
        credential = await ctx.get_credential("openaiApi")
        api_key = credential.get("apiKey")
        if not isinstance(api_key, str) or not api_key.strip():
            raise NodeError(
                "La clé API OpenAI est vide. Vérifiez le credential sélectionné.",
                NodeErrorType.CONFIG,
                source_node_id=ctx.node.get("id"),
            )

        try:
            from openai import AsyncOpenAI

            model = ctx.get_param("model") or "gpt-3.5-turbo"
            if model == "custom":
                model = ctx.get_param("customModel")
            if not isinstance(model, str) or not model.strip():
                raise NodeError(
                    "Choisissez un modèle OpenAI ou renseignez son identifiant personnalisé.",
                    NodeErrorType.CONFIG,
                    source_node_id=ctx.node.get("id"),
                )

            return {
                "provider": "openai",
                "client": AsyncOpenAI(api_key=api_key.strip()),
                "model": model,
                "temperature": ctx.get_param("temperature"),
                "maxTokens": ctx.get_param("maxTokens"),
                "nodeId": ctx.node.get("id"),
            }
        except NodeError:
            raise
        except Exception as error:
            raise NodeError(
                "Impossible d’initialiser le modèle OpenAI. Vérifiez sa configuration.",
                NodeErrorType.CONFIG,
                source_node_id=ctx.node.get("id"),
                cause=error,
            ) from error


# Export the node
openai_chat_model_node = OpenAIChatModelNode()
