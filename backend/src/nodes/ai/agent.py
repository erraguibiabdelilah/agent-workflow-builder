"""AI Agent node."""
import json
from typing import Any, List

from ..types import (
    ExecuteContext,
    Item,
    NodeDefinition,
    NodeTypeDescription,
    NodeCategory,
    NodeKind,
    PropertyType,
    InputPort,
    OutputPort,
    ConnectionType,
    NodeProperty,
)
from ...lib.errors import NodeError, NodeErrorType
from .json_output import normalize_output_schema, validate_json_value


class AgentNode(NodeDefinition):
    """AI Agent node for conversational intelligence."""
    
    @property
    def description(self) -> NodeTypeDescription:
        return NodeTypeDescription(
            type="agent",
            version=1,
            display_name="Agent IA",
            description="Agent conversationnel intelligent",
            category=NodeCategory.AI,
            kind=NodeKind.REGULAR,
            icon="bot",
            color="var(--text)",
            inputs=[
                InputPort(type=ConnectionType.MAIN, required=True),
                InputPort(
                    type=ConnectionType.AI_LANGUAGE_MODEL,
                    display_name="Chat Model",
                    required=True,
                    max_connections=1,
                ),
                InputPort(
                    type=ConnectionType.AI_MEMORY,
                    display_name="Memory",
                    max_connections=1,
                ),
                InputPort(type=ConnectionType.AI_TOOL, display_name="Tools"),
            ],
            outputs=[OutputPort(type=ConnectionType.MAIN, display_name="Sortie")],
            properties=[
                NodeProperty(
                    name="role",
                    display_name="Rôle",
                    type=PropertyType.STRING,
                    required=True,
                    placeholder="Assistant serviable",
                    description="Rôle ou description de l'agent",
                ),
                NodeProperty(
                    name="systemPrompt",
                    display_name="Prompt système",
                    type=PropertyType.TEXT,
                    description="Instructions détaillées pour l'agent",
                    supports_expressions=True,
                ),
                NodeProperty(
                    name="inputTemplate",
                    display_name="Template d'entrée",
                    type=PropertyType.TEXT,
                    default="{{ $json.text }}",
                    supports_expressions=True,
                    description="Template pour formatter l'entrée utilisateur",
                ),
                NodeProperty(
                    name="outputMode",
                    display_name="Mode de sortie",
                    type=PropertyType.OPTIONS,
                    default="text",
                    options=[
                        {"value": "text", "label": "Texte"},
                        {"value": "json", "label": "JSON structuré"},
                    ],
                ),
                NodeProperty(
                    name="outputSchema",
                    display_name="Schéma JSON",
                    type=PropertyType.JSON,
                    description="Schéma JSON pour la sortie structurée",
                    show_when={"property": "outputMode", "equals": "json"},
                ),
                NodeProperty(
                    name="maxIterations",
                    display_name="Itérations max",
                    type=PropertyType.NUMBER,
                    default=5,
                    min=1,
                    max=15,
                    description="Nombre maximum d'itérations avec les outils",
                ),
                NodeProperty(
                    name="keepInput",
                    display_name="Conserver l'entrée",
                    type=PropertyType.BOOLEAN,
                    default=False,
                    description="Recopie les champs de l'item d'entrée dans la sortie",
                ),
            ],
        )
    
    async def execute(self, ctx: ExecuteContext) -> List[List[Item]]:
        """Run one OpenAI chat completion for every incoming item."""
        models = await ctx.get_sub_nodes(ConnectionType.AI_LANGUAGE_MODEL)
        if not models:
            raise NodeError(
                "Connectez un node OpenAI GPT à l’entrée Chat Model de l’agent.",
                NodeErrorType.CONFIG,
            )

        model = models[0]["value"]
        role = ctx.get_param("role") or "Assistant"
        system_prompt = ctx.get_param("systemPrompt") or ""
        system_message = f"Rôle : {role}"
        if system_prompt.strip():
            system_message = f"{system_message}\n\n{system_prompt.strip()}"

        output_mode = ctx.get_param("outputMode") or "text"
        output_schema = None
        if output_mode == "json":
            output_schema = normalize_output_schema(ctx.get_param("outputSchema"))
            system_message = (
                f"{system_message}\n\nRéponds uniquement avec un objet JSON valide conforme à ce schéma, sans bloc Markdown :\n"
                f"{json.dumps(output_schema, ensure_ascii=False)}"
            )
        keep_input = bool(ctx.get_param("keepInput"))
        max_iterations = ctx.get_param("maxIterations") or 5
        try:
            max_iterations = max(1, min(15, int(max_iterations)))
        except (TypeError, ValueError):
            raise NodeError("Le nombre maximal d’itérations doit être compris entre 1 et 15.", NodeErrorType.CONFIG)

        tool_handles = await ctx.get_sub_nodes(ConnectionType.AI_TOOL)
        tools: list[dict[str, Any]] = []
        tool_names: set[str] = set()
        for handle in tool_handles:
            tool = handle.get("value")
            if not isinstance(tool, dict):
                raise NodeError("Un sous-node outil est mal configuré.", NodeErrorType.CONFIG)
            name = tool.get("name")
            if not isinstance(name, str) or not name:
                raise NodeError("Un outil connecté n’a pas de nom valide.", NodeErrorType.CONFIG)
            if name in tool_names:
                raise NodeError(f"Le nom d’outil « {name} » est utilisé plusieurs fois.", NodeErrorType.CONFIG)
            if not callable(tool.get("execute")):
                raise NodeError(f"L’outil « {name} » n’est pas exécutable.", NodeErrorType.CONFIG)
            execute_tool = tool["execute"]
            tool_node_id = tool.get("nodeId")

            async def tracked_execute(arguments, execute=execute_tool, subnode_id=tool_node_id):
                try:
                    result = await execute(arguments)
                    if subnode_id:
                        await ctx.report_subnode_status(str(subnode_id), "success")
                    return result
                except Exception as error:
                    if subnode_id:
                        tool_error = error if isinstance(error, NodeError) else NodeError(
                            "L’outil a échoué.", NodeErrorType.TOOL,
                            source_node_id=str(subnode_id), cause=error,
                        )
                        await ctx.report_subnode_status(str(subnode_id), "error", tool_error)
                    raise

            tool["execute"] = tracked_execute
            tool_names.add(name)
            tools.append(tool)

        outputs: List[Item] = []
        traces: list[dict[str, Any]] = []

        for index, item in enumerate(ctx.items):
            item_data = item.get("json", {}) if isinstance(item, dict) else {}
            if not isinstance(item_data, dict):
                item_data = {"value": item_data}

            prompt = ctx.get_param("inputTemplate", index)
            if prompt is None:
                prompt = json.dumps(item_data, ensure_ascii=False)
            elif not isinstance(prompt, str):
                prompt = json.dumps(prompt, ensure_ascii=False)
            if not prompt.strip():
                raise NodeError(
                    f"L’entrée de l’agent est vide pour l’élément {index + 1}.",
                    NodeErrorType.VALIDATION,
                )

            temperature = model.get("temperature")
            max_tokens = model.get("maxTokens")
            provider = model.get("provider", "openai")
            memory_handles = await ctx.get_sub_nodes(ConnectionType.AI_MEMORY, index)
            memory = memory_handles[0].get("value") if memory_handles else None
            history: list[dict[str, str]] = []
            if isinstance(memory, dict) and callable(memory.get("load")):
                loaded_history = await memory["load"]()
                if isinstance(loaded_history, list):
                    history = [
                        entry for entry in loaded_history
                        if isinstance(entry, dict)
                        and entry.get("role") in {"user", "assistant"}
                        and isinstance(entry.get("content"), str)
                    ]

            try:
                if provider == "google":
                    answer, trace = await self._run_google(
                        model, system_message, prompt, tools, max_iterations,
                        temperature, max_tokens, history, output_schema,
                    )
                else:
                    answer, trace = await self._run_openai(
                        model, system_message, prompt, tools, max_iterations,
                        temperature, max_tokens, history, output_schema,
                    )
            except Exception as error:
                status_code = getattr(error, "status_code", None) or getattr(error, "code", None)
                source_node_id = model.get("nodeId")
                if status_code in (401, 403):
                    provider_names = {
                        "openai": "OpenAI", "google": "Google Gemini",
                        "anthropic": "Anthropic", "mistral": "Mistral",
                    }
                    provider_name = provider_names.get(str(provider).casefold(), str(provider))
                    raise NodeError(
                        f"Clé API invalide pour {provider_name}. Vérifiez le credential du modèle.",
                        NodeErrorType.AUTH,
                        source_node_id=source_node_id,
                        cause=error,
                    ) from error
                if status_code == 429:
                    raise NodeError(
                        "Limite de débit ou de quota du fournisseur atteinte. Vérifiez votre compte API.",
                        NodeErrorType.RATE_LIMIT,
                        source_node_id=source_node_id,
                        cause=error,
                    ) from error
                if status_code is not None:
                    raise NodeError(
                        f"Le fournisseur a refusé la requête (HTTP {status_code}). Vérifiez le modèle et les paramètres.",
                        NodeErrorType.CONFIG,
                        source_node_id=source_node_id,
                        cause=error,
                    ) from error
                if error.__class__.__name__ in {"APITimeoutError", "TimeoutError"}:
                    raise NodeError(
                        "Le délai de réponse du fournisseur a été dépassé.",
                        NodeErrorType.TIMEOUT,
                        source_node_id=source_node_id,
                        cause=error,
                    ) from error
                raise NodeError(
                    "Impossible de joindre le fournisseur du modèle. Vérifiez la connexion réseau du serveur.",
                    NodeErrorType.NETWORK,
                    source_node_id=source_node_id,
                    cause=error,
                ) from error

            if isinstance(memory, dict) and callable(memory.get("append")):
                await memory["append"]([
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": answer},
                ])

            traces.append(trace)

            result: dict[str, Any]
            if output_mode == "json":
                try:
                    parsed = json.loads(answer)
                    if not isinstance(parsed, dict):
                        raise ValueError("La réponse doit être un objet JSON")
                    validate_json_value(parsed, output_schema)
                    result = {**parsed, "output": answer}
                except (json.JSONDecodeError, ValueError) as error:
                    raise NodeError(
                        "La réponse de l’agent n’est pas un objet JSON valide.",
                        NodeErrorType.VALIDATION,
                        cause=error,
                    ) from error
            else:
                result = {"output": answer}

            if keep_input:
                result = {**item_data, **result}
            outputs.append(Item(data=result))

        ctx.trace = traces
        return [outputs]

    async def _run_openai(
        self, model: dict[str, Any], system_message: str, prompt: str,
        tools: list[dict[str, Any]], max_iterations: int,
        temperature: Any, max_tokens: Any, history: list[dict[str, str]],
        output_schema: dict[str, Any] | None,
    ) -> tuple[str, dict[str, Any]]:
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": system_message},
            *history,
            {"role": "user", "content": prompt},
        ]
        tool_by_name = {tool["name"]: tool for tool in tools}
        provider_tools = [
            {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool["description"],
                    "parameters": tool["parameters"],
                },
            }
            for tool in tools
        ]
        trace: dict[str, Any] = {
            "model": model["model"], "provider": "openai", "iterations": 0,
            "finishReason": "stop", "usage": {"inputTokens": 0, "outputTokens": 0},
            "steps": [],
        }
        for iteration in range(max_iterations + 1):
            request: dict[str, Any] = {"model": model["model"], "messages": messages}
            if temperature is not None:
                request["temperature"] = temperature
            if max_tokens is not None:
                request["max_tokens"] = max_tokens
            if output_schema is not None:
                request["response_format"] = {"type": "json_object"}
            if provider_tools and iteration < max_iterations:
                request["tools"] = provider_tools
            response = await model["client"].chat.completions.create(**request)
            trace["iterations"] = iteration + 1
            usage = getattr(response, "usage", None)
            if usage:
                trace["usage"]["inputTokens"] += getattr(usage, "prompt_tokens", 0) or 0
                trace["usage"]["outputTokens"] += getattr(usage, "completion_tokens", 0) or 0
            message = response.choices[0].message
            calls = message.tool_calls or []
            if not calls:
                trace["finishReason"] = getattr(response.choices[0], "finish_reason", None) or "stop"
                trace["steps"].append({"index": iteration + 1, "text": message.content or "", "toolCalls": [], "toolResults": []})
                return message.content or "", trace
            if iteration >= max_iterations:
                trace["finishReason"] = "maxIterations"
                trace["warning"] = "Limite d’itérations atteinte"
                return "La limite d’itérations des outils a été atteinte avant la fin de la réponse.", trace
            messages.append(message.model_dump(exclude_none=True))
            step = {"index": iteration + 1, "toolCalls": [], "toolResults": []}
            for call in calls:
                tool = tool_by_name.get(call.function.name)
                try:
                    arguments = json.loads(call.function.arguments or "{}")
                except (TypeError, json.JSONDecodeError):
                    arguments = {}
                step["toolCalls"].append({"toolName": call.function.name, "input": arguments})
                try:
                    if tool is None:
                        raise NodeError("L’outil demandé par le modèle n’existe pas.", NodeErrorType.TOOL)
                    if not isinstance(arguments, dict):
                        raise NodeError("Les paramètres fournis à l’outil sont invalides.", NodeErrorType.TOOL)
                    result = await tool["execute"](arguments)
                    content = json.dumps({"result": result}, ensure_ascii=False)
                    step["toolResults"].append({"toolName": call.function.name, "output": result})
                except Exception as error:
                    message_text = self._tool_error_message(error)
                    content = json.dumps({"error": message_text}, ensure_ascii=False)
                    step["toolResults"].append({"toolName": call.function.name, "error": message_text})
                messages.append({"role": "tool", "tool_call_id": call.id, "content": content})
            trace["steps"].append(step)
        trace["finishReason"] = "maxIterations"
        trace["warning"] = "Limite d’itérations atteinte"
        return "La limite d’itérations des outils a été atteinte avant la fin de la réponse.", trace

    async def _run_google(
        self, model: dict[str, Any], system_message: str, prompt: str,
        tools: list[dict[str, Any]], max_iterations: int,
        temperature: Any, max_tokens: Any, history: list[dict[str, str]],
        output_schema: dict[str, Any] | None,
    ) -> tuple[str, dict[str, Any]]:
        from google.genai import types

        tool_by_name = {tool["name"]: tool for tool in tools}
        provider_tools = []
        if tools:
            declarations = [
                types.FunctionDeclaration(
                    name=tool["name"], description=tool["description"],
                    parameters_json_schema=tool["parameters"],
                )
                for tool in tools
            ]
            provider_tools = [types.Tool(function_declarations=declarations)]
        config: dict[str, Any] = {"system_instruction": system_message}
        if temperature is not None:
            config["temperature"] = temperature
        if max_tokens is not None:
            config["max_output_tokens"] = max_tokens
        if output_schema is not None:
            config["response_mime_type"] = "application/json"
            config["response_json_schema"] = output_schema
        if provider_tools:
            config["tools"] = provider_tools
        trace: dict[str, Any] = {
            "model": model["model"], "provider": "google", "iterations": 0,
            "finishReason": "stop", "usage": {"inputTokens": 0, "outputTokens": 0},
            "steps": [],
        }

        contents: list[Any] = [
            types.Content(
                role="model" if entry["role"] == "assistant" else "user",
                parts=[types.Part.from_text(text=entry["content"])],
            )
            for entry in history
        ]
        contents.append(prompt)
        for iteration in range(max_iterations + 1):
            if iteration >= max_iterations and provider_tools:
                config.pop("tools", None)
            response = await model["client"].aio.models.generate_content(
                model=model["model"], contents=contents,
                config=types.GenerateContentConfig(**config),
            )
            trace["iterations"] = iteration + 1
            usage = getattr(response, "usage_metadata", None)
            if usage:
                trace["usage"]["inputTokens"] += getattr(usage, "prompt_token_count", 0) or 0
                trace["usage"]["outputTokens"] += getattr(usage, "candidates_token_count", 0) or 0
            calls = response.function_calls or []
            if not calls:
                candidate = response.candidates[0] if response.candidates else None
                trace["finishReason"] = str(getattr(candidate, "finish_reason", None) or "stop")
                trace["steps"].append({"index": iteration + 1, "text": response.text or "", "toolCalls": [], "toolResults": []})
                return response.text or "", trace
            if iteration >= max_iterations:
                trace["finishReason"] = "maxIterations"
                trace["warning"] = "Limite d’itérations atteinte"
                return "La limite d’itérations des outils a été atteinte avant la fin de la réponse.", trace
            if response.candidates and response.candidates[0].content:
                contents.append(response.candidates[0].content)
            function_responses = []
            step = {"index": iteration + 1, "toolCalls": [], "toolResults": []}
            for call in calls:
                arguments = call.args if isinstance(call.args, dict) else {}
                tool_name = call.name or "unknown"
                step["toolCalls"].append({"toolName": tool_name, "input": arguments})
                try:
                    tool = tool_by_name.get(tool_name)
                    if tool is None:
                        raise NodeError("L’outil demandé par le modèle n’existe pas.", NodeErrorType.TOOL)
                    if not isinstance(arguments, dict):
                        raise NodeError("Les paramètres fournis à l’outil sont invalides.", NodeErrorType.TOOL)
                    result = await tool["execute"](arguments)
                    payload = {"result": result}
                    step["toolResults"].append({"toolName": tool_name, "output": result})
                except Exception as error:
                    message_text = self._tool_error_message(error)
                    payload = {"error": message_text}
                    step["toolResults"].append({"toolName": tool_name, "error": message_text})
                function_responses.append(
                    types.Part.from_function_response(name=tool_name, response=payload)
                )
            trace["steps"].append(step)
            # Gemini's API accepts function responses as a user turn; a literal
            # "tool" role is rejected by the current GenerateContent endpoint.
            contents.append(types.Content(role="user", parts=function_responses))
        trace["finishReason"] = "maxIterations"
        trace["warning"] = "Limite d’itérations atteinte"
        return "La limite d’itérations des outils a été atteinte avant la fin de la réponse.", trace

    @staticmethod
    def _tool_error_message(error: Exception) -> str:
        if isinstance(error, NodeError):
            return error.message
        return "L’outil n’a pas pu terminer cette opération."


# Export the node
agent_node = AgentNode()
