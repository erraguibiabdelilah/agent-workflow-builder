"""User-scoped, windowed conversation memory for agents."""
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, desc, select

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
from ....db.database import AsyncSessionLocal
from ....db.models import AgentMemory, Execution


class WindowMemoryNode(NodeDefinition):
    @property
    def description(self) -> NodeTypeDescription:
        return NodeTypeDescription(
            type="memoryWindow",
            version=1,
            display_name="Memory Window",
            description="Conserve les derniers messages d'une conversation",
            category=NodeCategory.MEMORY,
            kind=NodeKind.SUBNODE,
            icon="database",
            color="var(--text-muted)",
            inputs=[],
            outputs=[OutputPort(type=ConnectionType.AI_MEMORY, display_name="Memory")],
            properties=[
                NodeProperty(
                    name="sessionKey",
                    display_name="Clé de session",
                    type=PropertyType.STRING,
                    default="default",
                    supports_expressions=True,
                    description="Sépare l'historique des différentes conversations",
                ),
                NodeProperty(
                    name="windowSize",
                    display_name="Messages à conserver",
                    type=PropertyType.NUMBER,
                    default=10,
                    min=1,
                    max=50,
                ),
            ],
        )

    async def supply(self, ctx: SupplyContext) -> dict[str, Any]:
        session_key = ctx.get_param("sessionKey")
        if not isinstance(session_key, str) or not session_key.strip():
            session_key = "default"
        session_key = session_key.strip()[:255]

        try:
            window_size = int(ctx.get_param("windowSize") or 10)
        except (TypeError, ValueError) as error:
            from ....lib.errors import NodeError, NodeErrorType

            raise NodeError("La taille de mémoire doit être un nombre entier.", NodeErrorType.CONFIG, cause=error) from error
        window_size = max(1, min(50, window_size))

        async with AsyncSessionLocal() as db:
            workflow_id = await db.scalar(
                select(Execution.workflow_id).where(
                    Execution.id == ctx.execution_id,
                    Execution.user_id == ctx.user_id,
                )
            )
        if workflow_id is None:
            from ....lib.errors import NodeError, NodeErrorType

            raise NodeError("Impossible de déterminer le workflow de la mémoire.", NodeErrorType.CONFIG)

        memory_node_id = str(ctx.node.get("id", ""))

        async def load(_requested_session_key: str | None = None) -> list[dict[str, str]]:
            requested = (_requested_session_key or session_key).strip() or "default"
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(AgentMemory)
                    .where(
                        AgentMemory.user_id == ctx.user_id,
                        AgentMemory.workflow_id == workflow_id,
                        AgentMemory.memory_node_id == memory_node_id,
                        AgentMemory.session_key == requested[:255],
                    )
                    .order_by(desc(AgentMemory.created_at), desc(AgentMemory.id))
                    .limit(window_size)
                )
                rows = list(result.scalars().all())
            rows.reverse()
            return [{"role": row.role, "content": row.content} for row in rows]

        async def append(
            messages: list[dict[str, Any]], _requested_session_key: str | None = None
        ) -> None:
            requested = (_requested_session_key or session_key).strip() or "default"
            normalized = [
                (str(message["role"]), str(message["content"]))
                for message in messages
                if isinstance(message, dict)
                and message.get("role") in {"user", "assistant"}
                and isinstance(message.get("content"), str)
            ]
            if not normalized:
                return
            async with AsyncSessionLocal() as db:
                db.add_all([
                    AgentMemory(
                        user_id=ctx.user_id,
                        workflow_id=workflow_id,
                        memory_node_id=memory_node_id,
                        session_key=requested[:255],
                        role=role,
                        content=content[:20_000],
                        created_at=datetime.now(timezone.utc),
                    )
                    for role, content in normalized
                ])
                await db.flush()
                result = await db.execute(
                    select(AgentMemory.id)
                    .where(
                        AgentMemory.user_id == ctx.user_id,
                        AgentMemory.workflow_id == workflow_id,
                        AgentMemory.memory_node_id == memory_node_id,
                        AgentMemory.session_key == requested[:255],
                    )
                    .order_by(desc(AgentMemory.created_at), desc(AgentMemory.id))
                )
                retained_ids = [row[0] for row in result.all()[:window_size]]
                stale_query = delete(AgentMemory).where(
                    AgentMemory.user_id == ctx.user_id,
                    AgentMemory.workflow_id == workflow_id,
                    AgentMemory.memory_node_id == memory_node_id,
                    AgentMemory.session_key == requested[:255],
                )
                if retained_ids:
                    stale_query = stale_query.where(AgentMemory.id.not_in(retained_ids))
                await db.execute(stale_query)
                await db.commit()

        return {"load": load, "append": append, "sessionKey": session_key, "windowSize": window_size}


window_memory_node = WindowMemoryNode()
