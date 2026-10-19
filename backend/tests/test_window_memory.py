import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.db.models import AgentMemory, Base, Execution, User, Workflow
from src.engine.context import SupplyContext
from src.nodes.ai.memory import window_memory


@pytest.mark.asyncio
async def test_window_memory_is_limited_and_scoped(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    user_id = "user-one"
    workflow_id = "workflow-one"
    execution_id = "execution-one"
    async with session_factory() as db:
        db.add(User(id=user_id, email="memory@example.test", hashed_password="unused"))
        db.add(User(id="user-two", email="memory-two@example.test", hashed_password="unused"))
        db.add(Workflow(id=workflow_id, user_id=user_id, name="Memory", active=False, definition={}))
        db.add(Execution(id=execution_id, workflow_id=workflow_id, user_id=user_id, mode="manual", status="running"))
        db.add(Workflow(id="workflow-two", user_id="user-two", name="Other user", active=False, definition={}))
        db.add(Execution(id="execution-two", workflow_id="workflow-two", user_id="user-two", mode="manual", status="running"))
        db.add(Workflow(id="workflow-three", user_id=user_id, name="Other workflow", active=False, definition={}))
        db.add(Execution(id="execution-three", workflow_id="workflow-three", user_id=user_id, mode="manual", status="running"))
        await db.commit()

    monkeypatch.setattr(window_memory, "AsyncSessionLocal", session_factory)
    context = SupplyContext(
        workflow={},
        node={"id": "memory-node", "parameters": {"sessionKey": "{{ $json.session }}", "windowSize": 2}},
        execution_id=execution_id,
        user_id=user_id,
        vars={"$json": {"session": "chat-a"}},
    )
    memory = await window_memory.window_memory_node.supply(context)
    await memory["append"]([
        {"role": "user", "content": "question 1"},
        {"role": "assistant", "content": "answer 1"},
        {"role": "user", "content": "question 2"},
    ])

    assert await memory["load"]() == [
        {"role": "assistant", "content": "answer 1"},
        {"role": "user", "content": "question 2"},
    ]
    assert await memory["load"]("chat-b") == []

    other_node = await window_memory.window_memory_node.supply(SupplyContext(
        workflow={},
        node={"id": "another-memory-node", "parameters": {"sessionKey": "chat-a", "windowSize": 2}},
        execution_id=execution_id,
        user_id=user_id,
    ))
    other_user = await window_memory.window_memory_node.supply(SupplyContext(
        workflow={},
        node={"id": "memory-node", "parameters": {"sessionKey": "chat-a", "windowSize": 2}},
        execution_id="execution-two",
        user_id="user-two",
    ))
    other_workflow = await window_memory.window_memory_node.supply(SupplyContext(
        workflow={},
        node={"id": "memory-node", "parameters": {"sessionKey": "chat-a", "windowSize": 2}},
        execution_id="execution-three",
        user_id=user_id,
    ))
    assert await other_node["load"]() == []
    assert await other_user["load"]() == []
    assert await other_workflow["load"]() == []

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
    await engine.dispose()
