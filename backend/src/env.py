"""Environment configuration and validation."""
import os
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with Pydantic validation."""
    
    # Server
    port: int = Field(default=8000, ge=1, le=65535)
    app_url: str = Field(default="http://localhost:5173")
    public_url: Optional[str] = Field(default=None)
    
    # Database
    database_url: str = Field(default="sqlite:///./data/app.db")
    
    # Security
    secret_key: str = Field(min_length=32)
    encryption_key: str = Field(min_length=44)  # 32 bytes base64 encoded
    
    # Network
    allow_private_network: bool = Field(default=False)
    
    # Demo/Development
    demo_email: Optional[str] = Field(default=None)
    demo_password: Optional[str] = Field(default=None)
    
    @validator("encryption_key")
    def validate_encryption_key(cls, v: str) -> str:
        """Validate encryption key is proper base64."""
        import base64
        try:
            decoded = base64.b64decode(v)
            if len(decoded) < 16:  # At least 16 bytes for security
                raise ValueError("Encryption key must be at least 16 bytes when decoded")
            return v
        except Exception:
            raise ValueError("Encryption key must be valid base64 encoding")
    
    @validator("database_url")
    def validate_database_url(cls, v: str) -> str:
        """Ensure database directory exists."""
        if v.startswith("sqlite:///"):
            db_path = Path(v[10:])  # Remove sqlite:/// prefix
            db_path.parent.mkdir(parents=True, exist_ok=True)
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()

# Ensure data directory exists
data_dir = Path("./data")
data_dir.mkdir(exist_ok=True)