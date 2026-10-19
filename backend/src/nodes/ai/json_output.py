"""Lightweight JSON Schema validation for agent structured responses."""
import json
from typing import Any

from ...lib.errors import NodeError, NodeErrorType

_SCHEMA_TYPES = {"object", "array", "string", "number", "integer", "boolean", "null"}


def normalize_output_schema(value: Any) -> dict[str, Any]:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError as error:
            raise NodeError("Le schéma de sortie JSON n’est pas un JSON valide.", NodeErrorType.CONFIG, cause=error) from error
    if not isinstance(value, dict):
        raise NodeError("Renseignez un schéma JSON de sortie sous forme d’objet.", NodeErrorType.CONFIG)
    _validate_schema_definition(value, "schéma")
    return value


def validate_json_value(value: Any, schema: dict[str, Any], path: str = "sortie") -> None:
    expected = schema.get("type")
    actual = _matches_type(value, expected)
    if expected and not actual:
        raise ValueError(f"{path} doit être de type {expected}.")
    if "enum" in schema and value not in schema["enum"]:
        raise ValueError(f"{path} ne correspond à aucune valeur autorisée.")

    if isinstance(value, dict):
        properties = schema.get("properties", {})
        for name in schema.get("required", []):
            if name not in value:
                raise ValueError(f"Le champ obligatoire « {name} » manque dans {path}.")
        if schema.get("additionalProperties") is False:
            extra = set(value) - set(properties)
            if extra:
                raise ValueError(f"Le champ « {sorted(extra)[0]} » n’est pas autorisé dans {path}.")
        for name, child_schema in properties.items():
            if name in value:
                validate_json_value(value[name], child_schema, f"{path}.{name}")

    if isinstance(value, list) and isinstance(schema.get("items"), dict):
        for index, item in enumerate(value):
            validate_json_value(item, schema["items"], f"{path}[{index}]")
    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0):
            raise ValueError(f"{path} est trop court.")
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            raise ValueError(f"{path} est trop long.")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            raise ValueError(f"{path} est inférieur au minimum autorisé.")
        if "maximum" in schema and value > schema["maximum"]:
            raise ValueError(f"{path} dépasse le maximum autorisé.")


def _validate_schema_definition(schema: Any, path: str) -> None:
    if not isinstance(schema, dict):
        raise NodeError(f"La définition de {path} doit être un objet JSON Schema.", NodeErrorType.CONFIG)
    schema_type = schema.get("type")
    if schema_type is not None and schema_type not in _SCHEMA_TYPES:
        raise NodeError(f"Le type de {path} n’est pas pris en charge.", NodeErrorType.CONFIG)
    for bound in ("minLength", "maxLength", "minimum", "maximum"):
        if bound in schema and (isinstance(schema[bound], bool) or not isinstance(schema[bound], (int, float)) or schema[bound] < 0 and bound in {"minLength", "maxLength"}):
            raise NodeError(f"La contrainte {bound} de {path} est invalide.", NodeErrorType.CONFIG)
    properties = schema.get("properties", {})
    if not isinstance(properties, dict):
        raise NodeError(f"Les propriétés de {path} doivent former un objet.", NodeErrorType.CONFIG)
    required = schema.get("required", [])
    if not isinstance(required, list) or any(not isinstance(item, str) for item in required):
        raise NodeError(f"La liste required de {path} est invalide.", NodeErrorType.CONFIG)
    if any(name not in properties for name in required):
        raise NodeError(f"La liste required de {path} référence un champ inconnu.", NodeErrorType.CONFIG)
    for name, child_schema in properties.items():
        _validate_schema_definition(child_schema, f"{path}.{name}")
    if "items" in schema:
        _validate_schema_definition(schema["items"], f"{path}.items")


def _matches_type(value: Any, expected: Any) -> bool:
    if expected is None:
        return True
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "null":
        return value is None
    return False
