import json
from types import SimpleNamespace

import pytest

from src.lib.errors import NodeError
from src.nodes.ai.agent import AgentNode
from src.nodes.ai.tools.calculator import calculate
from src.nodes.ai.tools.schema import build_tool_schema


def test_calculator_evaluates_arithmetic_without_python_calls():
    assert calculate("(12 + 6) / 3") == 6
    with pytest.raises(NodeError):
        calculate("__import__('os').getcwd()")


def test_tool_schema_builds_required_json_parameters():
    schema = build_tool_schema([
        {"name": "city", "type": "string", "description": "City", "required": True},
        {"name": "days", "type": "number", "description": "Days", "required": False},
    ])
    assert schema["required"] == ["city"]
    assert schema["properties"]["days"]["type"] == "number"
    assert schema["additionalProperties"] is False


class _FakeMessage:
    def __init__(self, content=None, tool_calls=None):
        self.content = content
        self.tool_calls = tool_calls or []

    def model_dump(self, exclude_none=True):
        return {"role": "assistant", "content": self.content, "tool_calls": []}


class _FakeCompletionClient:
    def __init__(self):
        self.responses = [
            _FakeMessage(tool_calls=[SimpleNamespace(
                id="call-1",
                function=SimpleNamespace(name="get_weather", arguments='{"city":"Marrakech"}'),
            )]),
            _FakeMessage(content="Il fera beau à Marrakech."),
        ]
        self.requests = []
        self.chat = SimpleNamespace(completions=self)

    async def create(self, **request):
        self.requests.append(request)
        return SimpleNamespace(choices=[SimpleNamespace(message=self.responses.pop(0))])


class _FakeAgentContext:
    node = {"id": "agent-id", "parameters": {}}
    items = [{"json": {"text": "Quelle météo à Marrakech ?"}}]

    def __init__(self):
        self.client = _FakeCompletionClient()

    def get_param(self, name, item_index=0):
        if name == "inputTemplate":
            return self.items[item_index]["json"]["text"]
        return {
            "role": "Assistant météo",
            "systemPrompt": "Réponds en français.",
            "outputMode": "text",
            "keepInput": False,
            "maxIterations": 5,
        }.get(name)

    async def get_sub_nodes(self, connection_type, item_index=0):
        if connection_type == "ai_languageModel":
            return [{"value": {"provider": "openai", "client": self.client,
                               "model": "test-model", "temperature": 0,
                               "maxTokens": 100}}]
        if connection_type != "ai_tool":
            return []
        return [{"value": {
            "name": "get_weather", "description": "Récupère la météo",
            "parameters": {"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]},
            "execute": self._weather,
        }}]

    async def report_subnode_status(self, node_id, status, error=None):
        return None

    async def _weather(self, args):
        assert args == {"city": "Marrakech"}
        return '{"temperature": 24}'


@pytest.mark.asyncio
async def test_agent_calls_connected_tool_then_uses_its_result():
    ctx = _FakeAgentContext()
    result = await AgentNode().execute(ctx)

    assert result[0][0].data["output"] == "Il fera beau à Marrakech."
    assert "tools" in ctx.client.requests[0]
    assert ctx.client.requests[1]["messages"][-1]["role"] == "tool"


@pytest.mark.asyncio
async def test_agent_reads_and_appends_connected_memory():
    class MemoryClient(_FakeCompletionClient):
        def __init__(self):
            super().__init__()
            self.responses = [_FakeMessage(content="Je m'en souviendrai.")]

    ctx = _FakeAgentContext()
    ctx.client = MemoryClient()
    stored = []
    async def load():
        return [{"role": "assistant", "content": "La destination est Marrakech."}]
    async def append(messages):
        stored.extend(messages)
    original_get_sub_nodes = ctx.get_sub_nodes
    async def get_sub_nodes(connection_type, item_index=0):
        if connection_type == "ai_memory":
            return [{"value": {"load": load, "append": append}}]
        if connection_type == "ai_tool":
            return []
        return await original_get_sub_nodes(connection_type, item_index)
    ctx.get_sub_nodes = get_sub_nodes

    result = await AgentNode().execute(ctx)

    assert result[0][0].data["output"] == "Je m'en souviendrai."
    assert ctx.client.requests[0]["messages"][1] == {
        "role": "assistant", "content": "La destination est Marrakech."
    }
    assert stored == [
        {"role": "user", "content": "Quelle météo à Marrakech ?"},
        {"role": "assistant", "content": "Je m'en souviendrai."},
    ]


@pytest.mark.asyncio
async def test_agent_validates_and_returns_flat_json_output():
    class JsonClient(_FakeCompletionClient):
        def __init__(self):
            super().__init__()
            self.responses = [_FakeMessage(content='{"category":"weather","days":3}')]

    ctx = _FakeAgentContext()
    ctx.client = JsonClient()
    original_get_param = ctx.get_param
    def get_param(name, item_index=0):
        if name == "outputMode":
            return "json"
        if name == "outputSchema":
            return {"type": "object", "properties": {
                "category": {"type": "string"}, "days": {"type": "integer"}
            }, "required": ["category", "days"], "additionalProperties": False}
        return original_get_param(name, item_index)
    ctx.get_param = get_param

    result = await AgentNode().execute(ctx)

    assert result[0][0].data["category"] == "weather"
    assert result[0][0].data["days"] == 3
    assert json.loads(result[0][0].data["output"]) == {"category": "weather", "days": 3}
    assert ctx.client.requests[0]["response_format"] == {"type": "json_object"}


@pytest.mark.asyncio
async def test_agent_stops_tool_calls_at_max_iterations():
    class RepeatingClient(_FakeCompletionClient):
        def __init__(self):
            super().__init__()
            call = lambda: _FakeMessage(tool_calls=[SimpleNamespace(
                id="call-repeat",
                function=SimpleNamespace(name="get_weather", arguments='{"city":"Marrakech"}'),
            )])
            self.responses = [call(), call()]

    ctx = _FakeAgentContext()
    ctx.client = RepeatingClient()
    original_get_param = ctx.get_param
    def get_param(name, item_index=0):
        if name == "maxIterations":
            return 1
        return original_get_param(name, item_index)
    ctx.get_param = get_param

    result = await AgentNode().execute(ctx)

    assert len(ctx.client.requests) == 2
    assert "limite d’itérations" in result[0][0].data["output"]
    assert ctx.trace[0]["finishReason"] == "maxIterations"
    assert ctx.trace[0]["warning"] == "Limite d’itérations atteinte"
