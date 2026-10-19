"""Validation and JSON schema helpers for agent tools."""
import re
from typing import Any

from ....lib.errors import NodeError, NodeErrorType

_TOOL_NAME = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
_PARAMETER_TYPES = {"string", "number", "boolean"}


def build_tool_schema(parameters: Any) -> dict[str, Any]:
    """Convert the editor's parameter rows into a provider-neutral JSON schema."""
    if not isinstance(parameters, list):
        raise NodeError("Les paramètres de l’outil doivent être une liste.", NodeErrorType.CONFIG)

    properties: dict[str, Any] = {}
    required: list[str] = []
    for parameter in parameters:
        if not isinstance(parameter, dict):
            raise NodeError("Un paramètre de l’outil est invalide.", NodeErrorType.CONFIG)
        name = parameter.get("name")
        parameter_type = parameter.get("type", "string")
        description = parameter.get("description", "")
        if not isinstance(name, str) or not _TOOL_NAME.fullmatch(name):
            raise NodeError("Chaque paramètre doit avoir un nom valide.", NodeErrorType.CONFIG)
        if name in properties:
            raise NodeError("Les noms des paramètres de l’outil doivent être uniques.", NodeErrorType.CONFIG)
        if parameter_type not in _PARAMETER_TYPES:
            raise NodeError(f"Le type du paramètre « {name} » est invalide.", NodeErrorType.CONFIG)
        properties[name] = {"type": parameter_type, "description": str(description)}
        if parameter.get("required"):
            required.append(name)

    return {
        "type": "object",
        "properties": properties,
        "required": required,
        "additionalProperties": False,
    }


def validate_tool_name(name: Any) -> str:
    """Validate the name exposed to the provider API."""
    if not isinstance(name, str) or not _TOOL_NAME.fullmatch(name):
        raise NodeError(
            "Le nom de l’outil doit contenir 1 à 64 lettres, chiffres, tirets ou tirets bas.",
            NodeErrorType.CONFIG,
        )
    return name
