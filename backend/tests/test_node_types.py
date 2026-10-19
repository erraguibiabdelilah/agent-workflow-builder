"""Tests for the authenticated node-types endpoint."""

from collections.abc import Generator

import pytest
from fastapi import Header, HTTPException
from fastapi.testclient import TestClient

from src import app as app_module
from src.auth.dependencies import get_current_user
from src.db.models import User


async def authenticated_test_user(authorization: str | None = Header(default=None)) -> User:
    """Keep this endpoint test independent from JWT and database setup."""
    if authorization != "Bearer test-session":
        raise HTTPException(status_code=401, detail="Not authenticated")
    return User(id="test-user-id", email="editor@example.com", hashed_password="unused")


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    async def skip_database_startup() -> None:
        return None

    monkeypatch.setattr(app_module, "init_db", skip_database_startup)
    app = app_module.create_app()
    app.dependency_overrides[get_current_user] = authenticated_test_user

    with TestClient(app) as test_client:
        yield test_client


def test_node_types_requires_a_session(client: TestClient) -> None:
    response = client.get("/api/node-types")

    assert response.status_code == 401


def test_node_types_returns_descriptions_for_a_session(client: TestClient) -> None:
    response = client.get(
        "/api/node-types",
        headers={"Authorization": "Bearer test-session"},
    )

    assert response.status_code == 200
    descriptions = response.json()
    assert isinstance(descriptions, list)
    assert descriptions
    assert all("type" in description and "displayName" in description for description in descriptions)
