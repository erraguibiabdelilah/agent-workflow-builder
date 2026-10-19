"""Error handling utilities."""
from enum import Enum
from typing import Any, Dict, Optional


class NodeErrorType(str, Enum):
    """Node error types."""
    VALIDATION = "validation"
    CONFIG = "config"
    AUTH = "auth"
    RATE_LIMIT = "rate_limit"
    TIMEOUT = "timeout"
    NETWORK = "network"
    TOOL = "tool"
    UNKNOWN = "unknown"


class NodeError(Exception):
    """Node execution error with type and details."""
    
    def __init__(
        self,
        message: str,
        error_type: NodeErrorType,
        source_node_id: Optional[str] = None,
        cause: Optional[Exception] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.type = error_type if isinstance(error_type, NodeErrorType) else NodeErrorType(error_type)
        self.source_node_id = source_node_id
        self.cause = cause
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "type": self.type.value,
            "message": self.message,
            "sourceNodeId": self.source_node_id,
            "details": self.details,
        }


class ExecutionError(Exception):
    """Workflow execution error."""
    
    def __init__(self, message: str, cause: Optional[Exception] = None):
        super().__init__(message)
        self.message = message
        self.cause = cause


class APIError(Exception):
    """API error with structured format."""
    
    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            }
        }
