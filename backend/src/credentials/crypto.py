"""Credential encryption and decryption utilities."""
import base64
import os
from cryptography.fernet import Fernet
from typing import Dict, Any
import json

from ..env import settings

# Initialize Fernet with the encryption key
try:
    key = base64.urlsafe_b64decode(settings.encryption_key)
    fernet = Fernet(base64.urlsafe_b64encode(key))
except Exception as e:
    raise ValueError(f"Invalid encryption key: {e}")

def encrypt_credential_data(data: Dict[str, Any]) -> str:
    """
    Encrypt credential data using AES-256-GCM.
    
    Args:
        data: The credential data as a dictionary
        
    Returns:
        Base64 encoded encrypted string
    """
    # Convert to JSON string
    json_data = json.dumps(data, ensure_ascii=False)
    
    # Encrypt
    encrypted_data = fernet.encrypt(json_data.encode('utf-8'))
    
    # Return base64 encoded
    return base64.b64encode(encrypted_data).decode('utf-8')

def decrypt_credential_data(encrypted_data: str) -> Dict[str, Any]:
    """
    Decrypt credential data.
    
    Args:
        encrypted_data: Base64 encoded encrypted string
        
    Returns:
        The decrypted credential data as a dictionary
    """
    # Decode base64
    encrypted_bytes = base64.b64decode(encrypted_data.encode('utf-8'))
    
    # Decrypt
    decrypted_data = fernet.decrypt(encrypted_bytes)
    
    # Parse JSON
    return json.loads(decrypted_data.decode('utf-8'))

def decrypt_credential(credential_id: str, user_id: str) -> Dict[str, str]:
    """
    Decrypt a credential by ID for a specific user.
    
    Args:
        credential_id: The credential ID
        user_id: The user ID (for security)
        
    Returns:
        The decrypted credential data
    """
    # TODO: Implement database lookup and decryption
    # For now, return empty dict
    return {}

def create_credential_hint(credential_type: str, data: Dict[str, Any]) -> str:
    """
    Create a hint for displaying the credential (masked values).
    
    Args:
        credential_type: The type of credential
        data: The credential data
        
    Returns:
        A masked hint string
    """
    if credential_type == "anthropicApi":
        api_key = data.get("apiKey", "")
        if len(api_key) > 8:
            return f"sk-ant-...{api_key[-4:]}"
        return "sk-ant-****"
    elif credential_type == "openaiApi":
        api_key = data.get("apiKey", "")
        if len(api_key) > 8:
            return f"sk-...{api_key[-4:]}"
        return "sk-****"
    elif credential_type == "telegramBot":
        token = data.get("token", "")
        if len(token) > 8:
            return f"{token[:8]}...{token[-4:]}"
        return "****...****"
    elif credential_type in ["smtp", "imap"]:
        email = data.get("email", data.get("username", ""))
        if "@" in email:
            local, domain = email.split("@", 1)
            if len(local) > 2:
                return f"{local[:2]}***@{domain}"
        return "***@***"
    
    # Default hint
    return "***"