"""HTTP Request node - makes HTTP requests."""
from typing import Dict, List, Any, Optional
import json
from ..types import NodeDefinition, ExecuteContext
from ...lib.errors import NodeError
from ...lib.safe_fetch import safe_fetch

class HttpRequestNode:
    """Node that makes HTTP requests."""
    
    description = {
        "type": "httpRequest",
        "version": 1,
        "displayName": "HTTP Request",
        "description": "Effectue des requêtes HTTP vers des APIs externes",
        "subtitle": "{method} {url}",
        "category": "action",
        "kind": "regular", 
        "icon": "globe",
        "color": "var(--info)",
        "inputs": [{"type": "main", "required": True}],
        "outputs": [{"type": "main", "displayName": "Réponse"}],
        "properties": [
            {
                "name": "method",
                "displayName": "Méthode",
                "type": "options",
                "default": "GET",
                "required": True,
                "options": [
                    {"value": "GET", "label": "GET"},
                    {"value": "POST", "label": "POST"},
                    {"value": "PUT", "label": "PUT"},
                    {"value": "PATCH", "label": "PATCH"},
                    {"value": "DELETE", "label": "DELETE"}
                ]
            },
            {
                "name": "url",
                "displayName": "URL",
                "type": "string",
                "description": "L'URL à appeler",
                "required": True,
                "supportsExpressions": True,
                "placeholder": "https://api.example.com/data"
            },
            {
                "name": "headers",
                "displayName": "En-têtes",
                "type": "list",
                "description": "En-têtes HTTP personnalisés",
                "itemFields": [
                    {
                        "name": "name",
                        "displayName": "Nom",
                        "type": "string",
                        "required": True,
                        "placeholder": "Content-Type"
                    },
                    {
                        "name": "value",
                        "displayName": "Valeur", 
                        "type": "string",
                        "required": True,
                        "supportsExpressions": True,
                        "placeholder": "application/json"
                    }
                ]
            },
            {
                "name": "body",
                "displayName": "Corps de la requête",
                "type": "text",
                "description": "Données à envoyer (pour POST/PUT/PATCH)",
                "supportsExpressions": True,
                "placeholder": '{"key": "{{ $json.value }}"}'
            },
            {
                "name": "bodyType",
                "displayName": "Type de corps",
                "type": "options",
                "default": "json",
                "options": [
                    {"value": "json", "label": "JSON"},
                    {"value": "form", "label": "Form Data"},
                    {"value": "text", "label": "Texte brut"}
                ]
            },
            {
                "name": "timeout",
                "displayName": "Timeout (secondes)",
                "type": "number",
                "default": 30,
                "min": 1,
                "max": 300
            },
            {
                "name": "followRedirects",
                "displayName": "Suivre les redirections",
                "type": "boolean",
                "default": True
            }
        ]
    }
    
    async def execute(self, ctx: ExecuteContext) -> List[List[Dict[str, Any]]]:
        """Execute the HTTP Request node."""
        output_items = []
        
        for index, item in enumerate(ctx.items):
            try:
                # Get parameters for this item
                method = ctx.get_param("method", index) or "GET"
                url = ctx.get_param("url", index)
                headers_list = ctx.get_param("headers", index) or []
                body = ctx.get_param("body", index)
                body_type = ctx.get_param("bodyType", index) or "json"
                timeout = ctx.get_param("timeout", index) or 30
                follow_redirects = ctx.get_param("followRedirects", index)
                
                if not url:
                    raise NodeError("URL est requis", "validation")
                
                # Prepare headers
                headers = {}
                for header_item in headers_list:
                    if isinstance(header_item, dict):
                        name = header_item.get("name", "").strip()
                        value = header_item.get("value", "")
                        if name:
                            headers[name] = str(value)
                
                # Prepare body
                request_body = None
                if body and method.upper() in ["POST", "PUT", "PATCH"]:
                    if body_type == "json":
                        # Try to parse as JSON
                        try:
                            if isinstance(body, str):
                                request_body = json.loads(body)
                            else:
                                request_body = body
                            headers.setdefault("Content-Type", "application/json")
                        except json.JSONDecodeError:
                            raise NodeError("Corps JSON invalide", "validation")
                    else:
                        request_body = str(body)
                        if body_type == "form":
                            headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
                        else:
                            headers.setdefault("Content-Type", "text/plain")
                
                # Make request using safe_fetch
                response = await safe_fetch(
                    url=url,
                    method=method,
                    headers=headers,
                    data=request_body,
                    timeout=timeout,
                    allow_redirects=follow_redirects if follow_redirects is not None else True
                )
                
                # Create output item
                output_item = {
                    "json": {
                        "statusCode": response.get("status_code", 200),
                        "headers": response.get("headers", {}),
                        "body": response.get("data"),
                        "url": url,
                        "method": method
                    }
                }
                
                output_items.append(output_item)
                
            except NodeError:
                raise
            except Exception as e:
                raise NodeError(f"Erreur lors de la requête HTTP: {str(e)}", "network")
        
        return [output_items]

# Create instance for registry  
http_request_node = HttpRequestNode()
