"""Safe HTTP fetch with SSRF protection."""
import asyncio
import ipaddress
import socket
from typing import Any, Dict, Optional
from urllib.parse import urlparse

import httpx

from ..env import settings


class SSRFError(Exception):
    """SSRF protection error."""
    pass


def is_private_ip(ip: str) -> bool:
    """Check if IP address is private/internal."""
    try:
        addr = ipaddress.ip_address(ip)
        return (
            addr.is_private or
            addr.is_loopback or
            addr.is_link_local or
            addr.is_multicast or
            str(addr) == "169.254.169.254"  # AWS metadata
        )
    except ValueError:
        return False


async def resolve_hostname(hostname: str) -> str:
    """Resolve hostname to IP address."""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, socket.gethostbyname, hostname
        )
        return result
    except socket.gaierror as e:
        raise SSRFError(f"Failed to resolve hostname {hostname}: {e}")


async def safe_fetch(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    data: Optional[Any] = None,
    timeout: float = 30.0,
    max_size: int = 5 * 1024 * 1024,  # 5MB
    max_redirects: int = 3,
) -> httpx.Response:
    """
    Perform HTTP request with SSRF protection.
    
    Args:
        url: Target URL
        method: HTTP method
        headers: Request headers
        data: Request body
        timeout: Request timeout in seconds
        max_size: Maximum response size in bytes
        max_redirects: Maximum number of redirects to follow
    
    Returns:
        httpx.Response object
    
    Raises:
        SSRFError: If SSRF protection is triggered
        httpx.HTTPError: For other HTTP errors
    """
    parsed = urlparse(url)
    
    # Only allow HTTP/HTTPS
    if parsed.scheme not in ("http", "https"):
        raise SSRFError(f"Unsupported scheme: {parsed.scheme}")
    
    # Resolve hostname to IP
    if parsed.hostname:
        ip = await resolve_hostname(parsed.hostname)
        
        # Check if IP is private (unless explicitly allowed)
        if not settings.allow_private_network and is_private_ip(ip):
            raise SSRFError(f"Private IP address not allowed: {ip}")
    
    # Custom transport that validates redirect targets
    async def check_redirect_url(response: httpx.Response) -> None:
        """Validate redirect target URLs."""
        if response.is_redirect:
            location = response.headers.get("location")
            if location:
                redirect_parsed = urlparse(location)
                if redirect_parsed.hostname:
                    redirect_ip = await resolve_hostname(redirect_parsed.hostname)
                    if not settings.allow_private_network and is_private_ip(redirect_ip):
                        raise SSRFError(f"Redirect to private IP not allowed: {redirect_ip}")
    
    # Create HTTP client with limits
    limits = httpx.Limits(max_connections=10, max_keepalive_connections=5)
    
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(timeout),
        limits=limits,
        follow_redirects=False,  # We'll handle redirects manually
    ) as client:
        
        current_url = url
        redirect_count = 0
        
        while redirect_count <= max_redirects:
            response = await client.request(
                method=method,
                url=current_url,
                headers=headers,
                content=data,
            )
            
            # Check response size
            content_length = response.headers.get("content-length")
            if content_length and int(content_length) > max_size:
                raise SSRFError(f"Response too large: {content_length} bytes")
            
            # If not a redirect, return response
            if not response.is_redirect:
                # Read response with size limit
                content = b""
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    content += chunk
                    if len(content) > max_size:
                        raise SSRFError(f"Response content too large: {len(content)} bytes")
                
                # aiter_bytes() returns decompressed bytes. Remove transfer metadata
                # before building the buffered response so httpx does not decode twice.
                buffered_headers = response.headers.copy()
                buffered_headers.pop("content-encoding", None)
                buffered_headers.pop("content-length", None)
                return httpx.Response(
                    status_code=response.status_code,
                    headers=buffered_headers,
                    content=content,
                    request=response.request,
                )
            
            # Handle redirect
            if redirect_count >= max_redirects:
                raise SSRFError(f"Too many redirects: {redirect_count}")
            
            location = response.headers.get("location")
            if not location:
                raise SSRFError("Redirect without location header")
            
            # Validate redirect URL
            await check_redirect_url(response)
            
            # Update URL for next iteration
            if location.startswith(("http://", "https://")):
                current_url = location
            else:
                # Relative redirect
                current_url = str(response.url.copy_with(path=location))
            
            redirect_count += 1
            method = "GET"  # Redirects are always GET
            data = None
            
        raise SSRFError("Maximum redirects exceeded")
