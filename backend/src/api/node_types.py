"""Node types API endpoints."""
from typing import List

from fastapi import APIRouter, Depends

from ..auth.dependencies import get_current_active_user
from ..db.models import User
from ..nodes.registry import node_registry
from ..nodes.types import NodeTypeDescription

router = APIRouter()


@router.get("/node-types", response_model=List[NodeTypeDescription])
async def get_node_types(_user: User = Depends(get_current_active_user)):
    """Get available node types for an authenticated editor session."""
    return node_registry.get_all_descriptions()
