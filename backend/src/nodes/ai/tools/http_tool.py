"""HTTP agent tool implementation."""
import json
from typing import Any
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
from ....lib.safe_fetch import safe_fetch
from ....engine.expressions import resolve_expressions
from .schema import build_tool_schema, validate_tool_name


class HttpToolNode(NodeDefinition):
    @property
    def description(self) -> NodeTypeDescription:
        parameter_fields = [
            NodeProperty(name="name", display_name="Nom", type=PropertyType.STRING, required=True),
            NodeProperty(name="type", display_name="Type", type=PropertyType.OPTIONS, default="string", options=[
                {"value": "string", "label": "Texte"},
                {"value": "number", "label": "Nombre"},
                {"value": "boolean", "label": "Booléen"},
            ]),
            NodeProperty(name="description", display_name="Description", type=PropertyType.STRING, required=True),
            NodeProperty(name="required", display_name="Obligatoire", type=PropertyType.BOOLEAN, default=False),
        ]
        return NodeTypeDescription(
            type="httpTool",
            version=1,
            display_name="HTTP Tool",
            description="Appelle une API HTTP depuis un agent",
            category=NodeCategory.TOOL,
            kind=NodeKind.SUBNODE,
            icon="globe",
            color="var(--info)",
            inputs=[],
            outputs=[OutputPort(type=ConnectionType.AI_TOOL, display_name="Tool")],
            properties=[
                NodeProperty(name="toolName", display_name="Nom de l'outil", type=PropertyType.STRING, default="http_request", required=True),
                NodeProperty(name="description", display_name="Description", type=PropertyType.TEXT, required=True, description="Explique à l'agent quand cet outil doit être utilisé"),
                NodeProperty(name="parameters", display_name="Paramètres", type=PropertyType.LIST, default=[], item_fields=parameter_fields),
                NodeProperty(name="method", display_name="Méthode", type=PropertyType.OPTIONS, default="GET", options=[
                    {"value": "GET", "label": "GET"}, {"value": "POST", "label": "POST"},
                    {"value": "PUT", "label": "PUT"}, {"value": "PATCH", "label": "PATCH"},
                    {"value": "DELETE", "label": "DELETE"},
                ]),
                NodeProperty(name="url", display_name="URL", type=PropertyType.STRING, required=True, supports_expressions=True, placeholder="https://api.example.com/search?q={{ $tool.query }}"),
                NodeProperty(name="headers", display_name="En-têtes", type=PropertyType.LIST, default=[], item_fields=[
                    NodeProperty(name="name", display_name="Nom", type=PropertyType.STRING, required=True),
                    NodeProperty(name="value", display_name="Valeur", type=PropertyType.STRING, supports_expressions=True),
                ]),
                NodeProperty(name="body", display_name="Corps JSON", type=PropertyType.JSON, supports_expressions=True),
            ],
        )

    async def supply(self, ctx: SupplyContext) -> dict[str, Any]:
        name = validate_tool_name(ctx.get_param("toolName") or "http_request")
        description = ctx.get_param("description")
        if not isinstance(description, str) or not description.strip():
            raise NodeError("Décrivez à l’agent quand utiliser cet outil HTTP.", NodeErrorType.CONFIG)
        parameters = ctx.get_param("parameters") or []
        schema = build_tool_schema(parameters)

        async def execute(args: dict[str, Any]) -> str:
            try:
                variables = {"$tool": args}
                url = resolve_expressions(ctx.get_param("url") or "", variables)
                method = ctx.get_param("method") or "GET"
                headers_list = ctx.get_param("headers") or []
                headers: dict[str, str] = {}
                for header in headers_list:
                    if isinstance(header, dict) and header.get("name"):
                        headers[str(header["name"])] = str(
                            resolve_expressions(header.get("value", ""), variables)
                        )
                body = ctx.get_param("body")
                if body is not None:
                    body = resolve_expressions(body, variables)
                    if not isinstance(body, (str, bytes)):
                        body = json.dumps(body, ensure_ascii=False)
                response = await safe_fetch(
                    url=str(url), method=str(method).upper(), headers=headers,
                    data=body, timeout=20.0, max_size=20_000,
                )
                if response.status_code >= 400:
                    raise NodeError(
                        f"L’API appelée par l’outil HTTP a répondu avec le statut {response.status_code}.",
                        NodeErrorType.TOOL,
                    )
                try:
                    result: Any = response.json()
                except ValueError:
                    result = response.text
                serialized = json.dumps(result, ensure_ascii=False) if not isinstance(result, str) else result
                return serialized[:20_000]
            except NodeError:
                raise
            except Exception as error:
                raise NodeError(
                    "L’appel de l’outil HTTP a échoué. Vérifiez son URL et les paramètres.",
                    NodeErrorType.TOOL,
                    cause=error,
                ) from error

        return {
            "name": name,
            "description": description.strip(),
            "parameters": schema,
            "execute": execute,
            "nodeId": ctx.node.get("id"),
        }


http_tool_node = HttpToolNode()
