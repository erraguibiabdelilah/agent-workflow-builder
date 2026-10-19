"""Calculator agent tool implementation."""
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
from .calculator import calculate
from .schema import build_tool_schema, validate_tool_name


class CalculatorToolNode(NodeDefinition):
    @property
    def description(self) -> NodeTypeDescription:
        return NodeTypeDescription(
            type="calculatorTool",
            version=1,
            display_name="Calculator Tool",
            description="Effectue des calculs arithmétiques",
            category=NodeCategory.TOOL,
            kind=NodeKind.SUBNODE,
            icon="calculator",
            color="var(--text-muted)",
            inputs=[],
            outputs=[OutputPort(type=ConnectionType.AI_TOOL, display_name="Tool")],
            properties=[
                NodeProperty(name="toolName", display_name="Nom de l'outil", type=PropertyType.STRING, default="calculator", required=True),
                NodeProperty(name="description", display_name="Description", type=PropertyType.TEXT, default="Calcule une expression arithmétique", required=True),
                NodeProperty(
                    name="parameters",
                    display_name="Paramètres",
                    type=PropertyType.LIST,
                    default=[{"name": "expression", "type": "string", "description": "Expression arithmétique à calculer", "required": True}],
                    item_fields=[
                        NodeProperty(name="name", display_name="Nom", type=PropertyType.STRING, required=True),
                        NodeProperty(name="type", display_name="Type", type=PropertyType.OPTIONS, default="string", options=[
                            {"value": "string", "label": "Texte"},
                            {"value": "number", "label": "Nombre"},
                            {"value": "boolean", "label": "Booléen"},
                        ]),
                        NodeProperty(name="description", display_name="Description", type=PropertyType.STRING, required=True),
                        NodeProperty(name="required", display_name="Obligatoire", type=PropertyType.BOOLEAN, default=False),
                    ],
                ),
            ],
        )

    async def supply(self, ctx: SupplyContext) -> dict[str, Any]:
        name = validate_tool_name(ctx.get_param("toolName") or "calculator")
        description = ctx.get_param("description") or "Calcule une expression arithmétique"
        schema = build_tool_schema(ctx.get_param("parameters") or [])

        async def execute(args: dict[str, Any]) -> str:
            try:
                result = calculate(args.get("expression"))
                return str(result)
            except NodeError:
                raise
            except Exception as error:
                raise NodeError("Le calcul a échoué.", NodeErrorType.TOOL, cause=error) from error

        return {
            "name": name,
            "description": str(description),
            "parameters": schema,
            "execute": execute,
            "nodeId": ctx.node.get("id"),
        }


calculator_tool_node = CalculatorToolNode()
