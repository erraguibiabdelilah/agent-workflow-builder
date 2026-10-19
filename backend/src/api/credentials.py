"""Credentials API endpoints."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.dependencies import get_current_active_user
from ..credentials.crypto import (
    encrypt_credential_data,
    decrypt_credential_data,
    create_credential_hint,
)
from ..db.database import get_async_session
from ..db.models import User, Credential
from ..lib.ids import generate_id

router = APIRouter()


class CredentialCreate(BaseModel):
    """Credential creation model."""
    name: str
    type: str
    data: Dict[str, Any]


class CredentialUpdate(BaseModel):
    """Credential update model."""
    name: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class CredentialResponse(BaseModel):
    """Credential response model (without secrets)."""
    id: str
    name: str
    type: str
    hint: str
    created_at: datetime


class CredentialTestRequest(BaseModel):
    """Credential test request."""
    type: str
    data: Optional[Dict[str, Any]] = None
    credential_id: Optional[str] = None


@router.get("/credentials", response_model=List[CredentialResponse])
async def list_credentials(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """List user's credentials."""
    result = await db.execute(
        select(Credential).where(Credential.user_id == user.id)
    )
    credentials = result.scalars().all()
    
    credential_list = []
    for cred in credentials:
        credential_list.append(
            CredentialResponse(
                id=cred.id,
                name=cred.name,
                type=cred.type,
                hint=cred.hint,
                created_at=cred.created_at,
            )
        )
    
    return credential_list


@router.post("/credentials", response_model=CredentialResponse)
async def create_credential(
    credential_data: CredentialCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """Create a new credential."""
    # Encrypt the credential data
    encrypted_data = encrypt_credential_data(credential_data.data)
    
    # Create hint for display
    hint = create_credential_hint(credential_data.type, credential_data.data)
    
    credential = Credential(
        id=generate_id(),
        user_id=user.id,
        name=credential_data.name,
        type=credential_data.type,
        encrypted_data=encrypted_data,
        hint=hint,
    )
    
    db.add(credential)
    await db.commit()
    await db.refresh(credential)
    
    return CredentialResponse(
        id=credential.id,
        name=credential.name,
        type=credential.type,
        hint=credential.hint,
        created_at=credential.created_at,
    )


@router.put("/credentials/{credential_id}", response_model=CredentialResponse)
async def update_credential(
    credential_id: str,
    credential_data: CredentialUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """Update a credential."""
    result = await db.execute(
        select(Credential).where(
            Credential.id == credential_id,
            Credential.user_id == user.id
        )
    )
    credential = result.scalar_one_or_none()
    
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    # Update name if provided
    if credential_data.name is not None:
        credential.name = credential_data.name
    
    # Update data if provided
    if credential_data.data is not None:
        # Re-encrypt with new data
        credential.encrypted_data = encrypt_credential_data(credential_data.data)
        credential.hint = create_credential_hint(credential.type, credential_data.data)
    
    await db.commit()
    await db.refresh(credential)
    
    return CredentialResponse(
        id=credential.id,
        name=credential.name,
        type=credential.type,
        hint=credential.hint,
        created_at=credential.created_at,
    )


@router.delete("/credentials/{credential_id}")
async def delete_credential(
    credential_id: str,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """Delete a credential."""
    result = await db.execute(
        select(Credential).where(
            Credential.id == credential_id,
            Credential.user_id == user.id
        )
    )
    credential = result.scalar_one_or_none()
    
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    await db.delete(credential)
    await db.commit()
    
    return {"message": "Credential deleted successfully"}


@router.post("/credentials/test")
async def test_credential(
    test_request: CredentialTestRequest,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(get_current_active_user),
):
    """Test a credential connection."""
    # Get credential data
    if test_request.credential_id:
        # Test existing credential
        result = await db.execute(
            select(Credential).where(
                Credential.id == test_request.credential_id,
                Credential.user_id == user.id
            )
        )
        credential = result.scalar_one_or_none()
        
        if not credential:
            raise HTTPException(status_code=404, detail="Credential not found")
        
        # Decrypt data
        data = decrypt_credential_data(credential.encrypted_data)
        cred_type = credential.type
    elif test_request.data:
        # Test new credential data
        data = test_request.data
        cred_type = test_request.type
    else:
        raise HTTPException(
            status_code=400,
            detail="Either credential_id or data must be provided",
        )
    
    # Test the credential based on type
    try:
        normalized_type = cred_type.casefold()
        if normalized_type == "anthropicapi":
            await _test_anthropic(data)
        elif normalized_type == "openaiapi":
            await _test_openai(data)
        elif normalized_type in {"googleapi", "googleaiapi"}:
            await _test_google(data)
        elif normalized_type == "mistralapi":
            await _test_mistral(data)
        elif normalized_type == "telegrambot":
            await _test_telegram(data)
        elif normalized_type in ["smtp", "imap"]:
            await _test_email(cred_type, data)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported credential type: {cred_type}",
            )
        
        return {"success": True, "message": "Connexion réussie"}
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Échec de la connexion: {str(e)}",
        }


async def _test_anthropic(data: Dict[str, Any]) -> None:
    """Test Anthropic API connection."""
    import anthropic
    
    api_key = data.get("apiKey")
    if not api_key:
        raise ValueError("Clé API manquante")
    
    client = anthropic.Anthropic(api_key=api_key)
    # Simple test: list models or make a minimal request
    await client.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=1,
        messages=[{"role": "user", "content": "test"}],
    )


async def _test_openai(data: Dict[str, Any]) -> None:
    """Test OpenAI API connection."""
    from openai import AsyncOpenAI
    
    api_key = data.get("apiKey")
    if not api_key:
        raise ValueError("Clé API manquante")
    
    client = AsyncOpenAI(api_key=api_key)
    # Test with a minimal request
    await client.chat.completions.create(
        model="gpt-3.5-turbo",
        max_tokens=1,
        messages=[{"role": "user", "content": "test"}],
    )


async def _test_google(data: Dict[str, Any]) -> None:
    """Test Google API connection."""
    from google import genai
    from google.genai import types
    
    api_key = data.get("apiKey")
    if not api_key:
        raise ValueError("Clé API manquante")
    
    client = genai.Client(api_key=api_key)
    try:
        async with client.aio as async_client:
            await async_client.models.generate_content(
                model="gemini-3.5-flash-lite",
                contents="Réponds uniquement par OK.",
                config=types.GenerateContentConfig(max_output_tokens=1),
            )
    finally:
        client.close()


async def _test_mistral(data: Dict[str, Any]) -> None:
    """Test Mistral API connection."""
    from mistralai.async_client import MistralAsyncClient
    
    api_key = data.get("apiKey")
    if not api_key:
        raise ValueError("Clé API manquante")
    
    client = MistralAsyncClient(api_key=api_key)
    # Test with minimal request
    await client.chat(
        model="mistral-tiny",
        max_tokens=1,
        messages=[{"role": "user", "content": "test"}],
    )


async def _test_telegram(data: Dict[str, Any]) -> None:
    """Test Telegram bot token."""
    import httpx
    
    token = data.get("token")
    if not token:
        raise ValueError("Token manquant")
    
    # Test with getMe API call
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.telegram.org/bot{token}/getMe")
        response.raise_for_status()
        result = response.json()
        if not result.get("ok"):
            raise ValueError("Token invalide")


async def _test_email(cred_type: str, data: Dict[str, Any]) -> None:
    """Test email connection (SMTP or IMAP)."""
    import asyncio
    
    if cred_type == "smtp":
        import smtplib
        
        host = data.get("host")
        port = data.get("port", 587)
        username = data.get("username")
        password = data.get("password")
        
        if not all([host, username, password]):
            raise ValueError("Configuration SMTP incomplète")
        
        # Test SMTP connection
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            _test_smtp_sync,
            host,
            port,
            username,
            password,
        )
    
    elif cred_type == "imap":
        import imaplib
        
        host = data.get("host")
        port = data.get("port", 993)
        username = data.get("username")
        password = data.get("password")
        
        if not all([host, username, password]):
            raise ValueError("Configuration IMAP incomplète")
        
        # Test IMAP connection
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            _test_imap_sync,
            host,
            port,
            username,
            password,
        )


def _test_smtp_sync(host: str, port: int, username: str, password: str) -> None:
    """Synchronous SMTP test."""
    import smtplib
    
    with smtplib.SMTP(host, port, timeout=10) as server:
        server.starttls()
        server.login(username, password)


def _test_imap_sync(host: str, port: int, username: str, password: str) -> None:
    """Synchronous IMAP test."""
    import imaplib
    
    with imaplib.IMAP4_SSL(host, port) as server:
        server.login(username, password)
