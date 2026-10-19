"""Workflow API endpoints."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.dependencies import get_current_active_user
from ..db.database import get_async_session
from ..db.models import User, Workflow
from ..lib.ids import generate_id

router = APIRouter()


class WorkflowCreate(BaseModel):
    """Workflow creation model."""
    name: str
    nodes: List[Dict[str, Any]] = []
    connections: Dict[str, Any] = {}
    settings: Optional[Dict[str, Any]] = None


class WorkflowUpdate(BaseModel):
    """Workflow update model."""
    name: Optional[str] = None
    active: Optional[bool] = None
    nodes: Optional[List[Dict[str, Any]]] = None
    connections: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None


class WorkflowResponse(BaseModel):
    """Workflow response model."""
    id: str
    name: str
    active: bool
    nodes: List[Dict[str, Any]]
    connections: Dict[str, Any]
    settings: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


class WorkflowListItem(BaseModel):
    """Workflow list item model."""
    id: str
    name: str
    active: bool
    created_at: datetime
    updated_at: datetime
    last_execution: Optional[Dict[str, Any]] = None


@router.get("/workflows", response_model=List[WorkflowListItem])
async def list_workflows(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """List user's workflows."""
    result = await db.execute(
        select(Workflow).where(Workflow.user_id == user.id)
    )
    workflows = result.scalars().all()
    
    workflow_list = []
    for workflow in workflows:
        # TODO: Add last execution info
        workflow_list.append(
            WorkflowListItem(
                id=workflow.id,
                name=workflow.name,
                active=workflow.active,
                created_at=workflow.created_at,
                updated_at=workflow.updated_at,
                last_execution=None,
            )
        )
    
    return workflow_list


@router.post("/workflows", response_model=WorkflowResponse)
async def create_workflow(
    workflow_data: WorkflowCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """Create a new workflow."""
    definition = {
        "nodes": workflow_data.nodes,
        "connections": workflow_data.connections,
        "settings": workflow_data.settings or {},
    }
    
    workflow = Workflow(
        id=generate_id(),
        user_id=user.id,
        name=workflow_data.name,
        active=False,
        definition=definition,
    )
    
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)
    
    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        active=workflow.active,
        nodes=workflow.definition.get("nodes", []),
        connections=workflow.definition.get("connections", {}),
        settings=workflow.definition.get("settings"),
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.get("/workflows/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """Get a specific workflow."""
    result = await db.execute(
        select(Workflow).where(
            Workflow.id == workflow_id,
            Workflow.user_id == user.id
        )
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        active=workflow.active,
        nodes=workflow.definition.get("nodes", []),
        connections=workflow.definition.get("connections", {}),
        settings=workflow.definition.get("settings"),
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.put("/workflows/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    workflow_data: WorkflowUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """Update a workflow."""
    result = await db.execute(
        select(Workflow).where(
            Workflow.id == workflow_id,
            Workflow.user_id == user.id
        )
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Update fields
    if workflow_data.name is not None:
        workflow.name = workflow_data.name
    
    if workflow_data.active is not None:
        workflow.active = workflow_data.active
    
    # Update definition
    definition = workflow.definition.copy()
    
    if workflow_data.nodes is not None:
        definition["nodes"] = workflow_data.nodes
    
    if workflow_data.connections is not None:
        definition["connections"] = workflow_data.connections
    
    if workflow_data.settings is not None:
        definition["settings"] = workflow_data.settings
    
    workflow.definition = definition
    workflow.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(workflow)
    
    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        active=workflow.active,
        nodes=workflow.definition.get("nodes", []),
        connections=workflow.definition.get("connections", {}),
        settings=workflow.definition.get("settings"),
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.delete("/workflows/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """Delete a workflow."""
    result = await db.execute(
        select(Workflow).where(
            Workflow.id == workflow_id,
            Workflow.user_id == user.id
        )
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    await db.delete(workflow)
    await db.commit()
    
    return {"message": "Workflow deleted successfully"}


@router.post("/workflows/{workflow_id}/duplicate", response_model=WorkflowResponse)
async def duplicate_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """Duplicate a workflow."""
    result = await db.execute(
        select(Workflow).where(
            Workflow.id == workflow_id,
            Workflow.user_id == user.id
        )
    )
    original = result.scalar_one_or_none()
    
    if not original:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Create copy
    duplicate = Workflow(
        id=generate_id(),
        user_id=user.id,
        name=f"{original.name} (copie)",
        active=False,  # Always start inactive
        definition=original.definition.copy(),
    )
    
    db.add(duplicate)
    await db.commit()
    await db.refresh(duplicate)
    
    return WorkflowResponse(
        id=duplicate.id,
        name=duplicate.name,
        active=duplicate.active,
        nodes=duplicate.definition.get("nodes", []),
        connections=duplicate.definition.get("connections", {}),
        settings=duplicate.definition.get("settings"),
        created_at=duplicate.created_at,
        updated_at=duplicate.updated_at,
    )


@router.post("/workflows/{workflow_id}/activate")
async def activate_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """Activate a workflow (enable triggers)."""
    result = await db.execute(
        select(Workflow).where(
            Workflow.id == workflow_id,
            Workflow.user_id == user.id
        )
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow.active = True
    workflow.updated_at = datetime.utcnow()
    
    await db.commit()
    
    # TODO: Start triggers (TriggerManager)
    
    return {"message": "Workflow activated successfully"}


@router.post("/workflows/{workflow_id}/deactivate")
async def deactivate_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """Deactivate a workflow (disable triggers)."""
    result = await db.execute(
        select(Workflow).where(
            Workflow.id == workflow_id,
            Workflow.user_id == user.id
        )
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow.active = False
    workflow.updated_at = datetime.utcnow()
    
    await db.commit()
    
    # TODO: Stop triggers (TriggerManager)
    
    return {"message": "Workflow deactivated successfully"}


async def get_workflow_by_id(db: AsyncSession, workflow_id: str, user_id: str) -> Optional[Workflow]:
    """Helper function to get workflow by ID and user ID."""
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == user_id)
    )
    return result.scalar_one_or_none()
