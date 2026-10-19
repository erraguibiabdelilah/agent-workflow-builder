"""Set node - sets values in data items."""
from typing import Dict, List, Any
from ..types import NodeDefinition, ExecuteContext

class SetNode:
    """Node that sets values in data items."""
    
    description = {
        "type": "set",
        "version": 1,
        "displayName": "Set",
        "description": "Définit des valeurs dans les éléments de données",
        "subtitle": "Définir des valeurs",
        "category": "action", 
        "kind": "regular",
        "icon": "pen-line",
        "color": "var(--info)",
        "inputs": [{"type": "main", "required": True}],
        "outputs": [{"type": "main", "displayName": "Sortie"}],
        "properties": [
            {
                "name": "assignments",
                "displayName": "Affectations",
                "type": "list",
                "description": "Liste des valeurs à définir",
                "default": [{"key": "newField", "value": "newValue"}],
                "required": True,
                "itemFields": [
                    {
                        "name": "key",
                        "displayName": "Clé",
                        "type": "string",
                        "description": "Le nom du champ à définir",
                        "required": True,
                        "placeholder": "fieldName"
                    },
                    {
                        "name": "value", 
                        "displayName": "Valeur",
                        "type": "string",
                        "description": "La valeur à assigner",
                        "required": True,
                        "supportsExpressions": True,
                        "placeholder": "{{ $json.someField }}"
                    }
                ]
            },
            {
                "name": "mode",
                "displayName": "Mode",
                "type": "options",
                "description": "Comment traiter les données existantes",
                "default": "merge",
                "options": [
                    {"value": "merge", "label": "Fusionner avec les données existantes"},
                    {"value": "replace", "label": "Remplacer toutes les données"}
                ]
            }
        ]
    }
    
    async def execute(self, ctx: ExecuteContext) -> List[List[Dict[str, Any]]]:
        """Execute the Set node."""
        assignments = ctx.get_param("assignments") or []
        mode = ctx.get_param("mode") or "merge"
        
        output_items = []
        
        for index, item in enumerate(ctx.items):
            if mode == "replace":
                new_data = {}
            else:
                new_data = dict(item.get("json", {}))
            
            # Apply assignments
            for assignment in assignments:
                key = assignment.get("key", "").strip()
                if key:
                    # Resolve value with expressions for this specific item
                    value = ctx.get_param("assignments", index)
                    if isinstance(value, list) and len(value) > 0:
                        # Find the assignment for this key
                        for assign in value:
                            if assign.get("key") == key:
                                new_data[key] = assign.get("value")
                                break
            
            output_items.append({"json": new_data})
        
        return [output_items]

# Create instance for registry
set_node = SetNode()
