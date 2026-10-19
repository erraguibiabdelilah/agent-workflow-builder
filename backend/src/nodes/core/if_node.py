"""IF node - conditional routing of data items."""
from typing import Dict, List, Any
from ..types import NodeDefinition, ExecuteContext
from ...lib.errors import NodeError

class IfNode:
    """Node that routes items based on conditions."""
    
    description = {
        "type": "if",
        "version": 1,
        "displayName": "IF", 
        "description": "Route les items vers true ou false selon des conditions",
        "subtitle": "Routage conditionnel",
        "category": "logic",
        "kind": "regular",
        "icon": "split",
        "color": "var(--success)",
        "inputs": [{"type": "main", "required": True}],
        "outputs": [
            {"type": "main", "displayName": "true"},
            {"type": "main", "displayName": "false"}
        ],
        "properties": [
            {
                "name": "combinator",
                "displayName": "Combiner avec",
                "type": "options",
                "default": "and",
                "options": [
                    {"value": "and", "label": "ET"},
                    {"value": "or", "label": "OU"}
                ]
            },
            {
                "name": "conditions",
                "displayName": "Conditions",
                "type": "list",
                "required": True,
                "itemFields": [
                    {
                        "name": "value1",
                        "displayName": "Valeur 1",
                        "type": "string",
                        "supportsExpressions": True,
                        "required": True
                    },
                    {
                        "name": "operator",
                        "displayName": "Opérateur",
                        "type": "options",
                        "default": "equals",
                        "options": [
                            {"value": "equals", "label": "est égal à"},
                            {"value": "notEquals", "label": "est différent de"},
                            {"value": "contains", "label": "contient"},
                            {"value": "gt", "label": "supérieur à"},
                            {"value": "lt", "label": "inférieur à"},
                            {"value": "isEmpty", "label": "est vide"}
                        ]
                    },
                    {
                        "name": "value2",
                        "displayName": "Valeur 2",
                        "type": "string",
                        "supportsExpressions": True
                    }
                ]
            }
        ]
    }
    
    async def execute(self, ctx: ExecuteContext) -> List[List[Dict[str, Any]]]:
        """Execute the IF node.""" 
        conditions = ctx.get_param("conditions") or []
        combinator = ctx.get_param("combinator") or "and"
        
        true_items = []
        false_items = []
        
        for index, item in enumerate(ctx.items):
            # Evaluate conditions for this item
            result = self._evaluate_conditions(ctx, index, conditions, combinator)
            
            if result:
                true_items.append(item)
            else:
                false_items.append(item)
        
        return [true_items, false_items]
    
    def _evaluate_conditions(self, ctx: ExecuteContext, item_index: int, conditions: List[Dict], combinator: str) -> bool:
        """Evaluate all conditions for a single item."""
        if not conditions:
            return True
        
        results = []
        
        for condition in conditions:
            result = self._evaluate_single_condition(ctx, item_index, condition)
            results.append(result)
        
        # Combine results
        if combinator == "or":
            return any(results)
        else:  # "and" 
            return all(results)
    
    def _evaluate_single_condition(self, ctx: ExecuteContext, item_index: int, condition: Dict) -> bool:
        """Evaluate a single condition."""
        value1 = ctx.get_param("value1", item_index) if "value1" in condition else None
        value2 = ctx.get_param("value2", item_index) if "value2" in condition else None
        operator = condition.get("operator", "equals")
        
        # Handle different operators
        if operator == "equals":
            return self._safe_equals(value1, value2)
        elif operator == "notEquals":
            return not self._safe_equals(value1, value2)
        elif operator == "contains":
            return self._safe_contains(value1, value2)
        elif operator == "gt":
            return self._safe_compare(value1, value2) > 0
        elif operator == "lt":
            return self._safe_compare(value1, value2) < 0
        elif operator == "isEmpty":
            return self._is_empty(value1)
        else:
            return False
    
    def _safe_equals(self, value1: Any, value2: Any) -> bool:
        """Safe equality comparison."""
        try:
            return value1 == value2
        except:
            return False
    
    def _safe_contains(self, value1: Any, value2: Any) -> bool:
        """Safe contains check."""
        try:
            if value2 is None:
                return False
            return str(value2) in str(value1)
        except:
            return False
    
    def _safe_compare(self, value1: Any, value2: Any) -> int:
        """Safe numeric comparison. Returns -1, 0, or 1."""
        try:
            num1 = float(value1) if value1 is not None else 0
            num2 = float(value2) if value2 is not None else 0
            
            if num1 > num2:
                return 1
            elif num1 < num2:
                return -1
            else:
                return 0
        except:
            return 0
    
    def _is_empty(self, value: Any) -> bool:
        """Check if value is empty."""
        if value is None:
            return True
        if isinstance(value, (str, list, dict)):
            return len(value) == 0
        return False

# Create instance for registry
if_node = IfNode()
