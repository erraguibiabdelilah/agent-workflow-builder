"""Google Gemini chat model node description and implementation stub."""
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

GEMINI_TEXT_MODELS = [
    {"value": "gemini-4-argon", "label": "Gemini 4 Argon"},
    {"value": "gemini-3.8-flash", "label": "Gemini 3.8 Flash"},
    {"value": "gemini-3.6-flash", "label": "Gemini 3.6 Flash"},
    {"value": "gemini-3.5-flash-lite", "label": "Gemini 3.5 Flash-Lite"},
    {"value": "gemini-3.1-flash-lite", "label": "Gemini 3.1 Flash-Lite"},
    {"value": "gemini-3.1-pro-preview", "label": "Gemini 3.1 Pro (Preview)"},
    {"value": "gemini-3-flash-preview", "label": "Gemini 3 Flash (Preview)"},
    {"value": "gemini-2.5-pro", "label": "Gemini 2.5 Pro (accès limité)"},
    {"value": "gemini-2.5-flash", "label": "Gemini 2.5 Flash (accès limité)"},
    {"value": "gemini-2.5-flash-lite", "label": "Gemini 2.5 Flash-Lite (accès limité)"},
    {"value": "custom", "label": "Autre (ID personnalisé)"},
]


class GoogleChatModelNode(NodeDefinition):
    @property
    def description(self) -> NodeTypeDescription:
        return NodeTypeDescription(
            type="chatModelGoogle",
            version=1,
            display_name="Google Gemini",
            description="Modèle Gemini de Google",
            category=NodeCategory.MODEL,
            kind=NodeKind.SUBNODE,
            icon="google-ai",
            color="var(--info)",
            inputs=[],
            outputs=[OutputPort(type=ConnectionType.AI_LANGUAGE_MODEL, display_name="Model")],
            properties=[
                NodeProperty(
                    name="model",
                    display_name="Modèle",
                    type=PropertyType.OPTIONS,
                    default="gemini-3.8-flash",
                    required=True,
                    options=GEMINI_TEXT_MODELS,
                ),
                NodeProperty(
                    name="customModel",
                    display_name="ID du modèle",
                    type=PropertyType.STRING,
                    required=True,
                    show_when={"property": "model", "equals": "custom"},
                    placeholder="gemini-model-id",
                ),
                NodeProperty(name="temperature", display_name="Température", type=PropertyType.NUMBER, default=0.7, min=0, max=2),
                NodeProperty(name="maxTokens", display_name="Tokens max", type=PropertyType.NUMBER, default=1024, min=1),
            ],
            credentials=[{"type": "googleApi", "required": True}],
        )

    async def supply(self, ctx: SupplyContext):
        """Build a Gemini model handle using the owner's saved API credential."""
        credential = await ctx.get_credential("googleApi")
        api_key = credential.get("apiKey")
        if not isinstance(api_key, str) or not api_key.strip():
            raise NodeError(
                "La clé API Google est vide. Vérifiez le credential sélectionné.",
                NodeErrorType.CONFIG,
                source_node_id=ctx.node.get("id"),
            )

        model = ctx.get_param("model") or "gemini-3.8-flash"
        if model == "custom":
            model = ctx.get_param("customModel")
        if not isinstance(model, str) or not model.strip():
            raise NodeError(
                "Choisissez un modèle Gemini ou renseignez son identifiant personnalisé.",
                NodeErrorType.CONFIG,
                source_node_id=ctx.node.get("id"),
            )

        try:
            from google import genai

            return {
                "provider": "google",
                "client": genai.Client(api_key=api_key.strip()),
                "model": model,
                "temperature": ctx.get_param("temperature"),
                "maxTokens": ctx.get_param("maxTokens"),
                "nodeId": ctx.node.get("id"),
            }
        except NodeError:
            raise
        except Exception as error:
            raise NodeError(
                "Impossible d’initialiser le modèle Gemini. Vérifiez sa configuration.",
                NodeErrorType.CONFIG,
                source_node_id=ctx.node.get("id"),
                cause=error,
            ) from error


google_chat_model_node = GoogleChatModelNode()
