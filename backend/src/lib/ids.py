"""ID generation utilities."""
import secrets
import uuid


def generate_id() -> str:
    """Generate a UUID4 string."""
    return str(uuid.uuid4())


def generate_webhook_path() -> str:
    """Generate a secure random webhook path (16 bytes hex)."""
    return secrets.token_hex(16)


def generate_session_key() -> str:
    """Generate a session key for agent memory."""
    return secrets.token_hex(8)