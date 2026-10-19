"""FastAPI application entry point."""
import uvicorn
from .app import create_app
from .env import settings

app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
        log_level="info",
    )