"""Expression resolution for node parameters."""
import re
import json
from typing import Any, Dict, Union
from datetime import datetime

def resolve_expressions(template: str, context: Dict[str, Any]) -> Any:
    """
    Resolve expressions in a template string.
    
    Supports:
    - {{ $json.field }} - Access current item data
    - {{ $node["NodeName"].json.field }} - Access other node outputs  
    - {{ $env.VARIABLE }} - Environment variables
    - Simple path traversal with dot notation
    """
    if not isinstance(template, str):
        return template
    
    # Pattern to match {{ expression }}
    pattern = r'\{\{\s*([^}]+)\s*\}\}'
    
    def replace_expression(match):
        expression = match.group(1).strip()
        try:
            return str(evaluate_expression(expression, context))
        except Exception as e:
            # Return original expression on error
            return match.group(0)
    
    # If the entire string is a single expression, return the actual value
    full_match = re.fullmatch(pattern, template.strip())
    if full_match:
        expression = full_match.group(1).strip()
        try:
            return evaluate_expression(expression, context)
        except Exception:
            return template
    
    # Replace all expressions in the string
    result = re.sub(pattern, replace_expression, template)
    return result

def evaluate_expression(expression: str, context: Dict[str, Any]) -> Any:
    """
    Evaluate a single expression safely.
    
    Only supports path traversal, no arbitrary code execution.
    """
    # Handle array/object access like $node["NodeName"]
    if '[' in expression and ']' in expression:
        return evaluate_bracket_expression(expression, context)
    
    # Handle simple dot notation like $json.field
    parts = expression.split('.')
    current = context
    
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list) and part.isdigit():
            index = int(part)
            current = current[index] if 0 <= index < len(current) else None
        else:
            current = None
        
        if current is None:
            break
    
    return current

def evaluate_bracket_expression(expression: str, context: Dict[str, Any]) -> Any:
    """
    Evaluate expressions with bracket notation like $node["NodeName"].json.field
    """
    # Parse bracket notation
    bracket_pattern = r'(\$\w+)\[(["\']?)([^"\']+)\2\](.*)$'
    match = re.match(bracket_pattern, expression)
    
    if not match:
        return None
    
    base_var = match.group(1)  # e.g., "$node"
    key = match.group(3)       # e.g., "NodeName"  
    remaining = match.group(4) # e.g., ".json.field"
    
    # Get base variable
    base_value = context.get(base_var)
    if not isinstance(base_value, dict):
        return None
    
    # Get the keyed value
    current = base_value.get(key)
    if current is None:
        return None
    
    # Process remaining path
    if remaining.startswith('.'):
        remaining = remaining[1:]  # Remove leading dot
        
    if remaining:
        parts = remaining.split('.')
        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
            elif isinstance(current, list) and part.isdigit():
                index = int(part)
                current = current[index] if 0 <= index < len(current) else None
            else:
                current = None
            
            if current is None:
                break
    
    return current

# Utility functions for common expression contexts
def create_json_context(item_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create context for current item data."""
    return {"$json": item_data}

def create_node_context(node_outputs: Dict[str, Any]) -> Dict[str, Any]:
    """Create context for node outputs."""
    return {"$node": node_outputs}

def create_full_context(
    item_data: Dict[str, Any] = None,
    node_outputs: Dict[str, Any] = None,
    env_vars: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Create full expression context."""
    context = {}
    
    if item_data is not None:
        context["$json"] = item_data
    
    if node_outputs is not None:
        context["$node"] = node_outputs
    
    if env_vars is not None:
        context["$env"] = env_vars
    
    # Add current timestamp
    context["$now"] = {
        "timestamp": datetime.now().isoformat(),
        "unix": int(datetime.now().timestamp())
    }
    
    return context