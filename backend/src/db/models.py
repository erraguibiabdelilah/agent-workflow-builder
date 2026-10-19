"""Database models using SQLAlchemy."""
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.sqlite import CHAR
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Mapped, mapped_column, relationship

Base = declarative_base()


class UUIDMixin:
    """Mixin for UUID primary keys."""
    id: Mapped[str] = mapped_column(
        CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )


class TimestampMixin:
    """Mixin for timestamp fields."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class User(Base, UUIDMixin, TimestampMixin):
    """User model for FastAPI-Users."""
    __tablename__ = "user"
    
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Relationships
    workflows: Mapped[list["Workflow"]] = relationship("Workflow", back_populates="user")
    credentials: Mapped[list["Credential"]] = relationship("Credential", back_populates="user")
    executions: Mapped[list["Execution"]] = relationship("Execution", back_populates="user")


class Workflow(Base, UUIDMixin, TimestampMixin):
    """Workflow model."""
    __tablename__ = "workflows"
    
    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("user.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=False)
    definition: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="workflows")
    executions: Mapped[list["Execution"]] = relationship("Execution", back_populates="workflow")


class Credential(Base, UUIDMixin, TimestampMixin):
    """Credential model."""
    __tablename__ = "credentials"
    
    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("user.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    encrypted_data: Mapped[str] = mapped_column(Text, nullable=False)
    hint: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="credentials")


class Execution(Base, UUIDMixin):
    """Execution model."""
    __tablename__ = "executions"
    
    workflow_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("workflows.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("user.id"), nullable=False)
    mode: Mapped[str] = mapped_column(String(50), nullable=False)  # manual, trigger, webhook
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # running, success, error, cancelled
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="executions")
    user: Mapped["User"] = relationship("User", back_populates="executions")
    nodes: Mapped[list["ExecutionNode"]] = relationship("ExecutionNode", back_populates="execution")
    events: Mapped[list["ExecutionEvent"]] = relationship("ExecutionEvent", back_populates="execution")


class ExecutionNode(Base):
    """Execution node status model."""
    __tablename__ = "execution_nodes"
    
    execution_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("executions.id"), primary_key=True)
    node_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    input: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    output: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    error: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    trace: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    output_counts: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    execution: Mapped["Execution"] = relationship("Execution", back_populates="nodes")


class ExecutionEvent(Base):
    """Execution event model for SSE replay."""
    __tablename__ = "execution_events"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    execution_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("executions.id"), nullable=False)
    seq: Mapped[int] = mapped_column(nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    execution: Mapped["Execution"] = relationship("Execution", back_populates="events")


class AgentMemory(Base, UUIDMixin, TimestampMixin):
    """Agent memory model."""
    __tablename__ = "agent_memory"
    
    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("user.id"), nullable=False)
    workflow_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("workflows.id"), nullable=False)
    memory_node_id: Mapped[str] = mapped_column(String(100), nullable=False)
    session_key: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, nullable=False)


class TriggerState(Base):
    """Trigger state model for stateful triggers."""
    __tablename__ = "trigger_state"
    
    workflow_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("workflows.id"), primary_key=True)
    node_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    state: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WebhookRegistration(Base):
    """Webhook registration model."""
    __tablename__ = "webhook_registrations"
    
    path: Mapped[str] = mapped_column(String(255), primary_key=True)
    workflow_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("workflows.id"), nullable=False)
    node_id: Mapped[str] = mapped_column(String(100), nullable=False)
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())