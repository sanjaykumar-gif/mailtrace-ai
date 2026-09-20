"""
VirusTotal API v3 integration for MailTrace AI.

Queries VirusTotal for URL reputations, IP reputations, and attachment file hashes.
Gracefully handles missing or unconfigured API keys, network timeouts, and rate limits,
with thread-safe LRU caching to preserve API quotas.
"""

from __future__ import annotations

import base64
import os
from functools import lru_cache
from typing import Any, Dict, Optional
import requests

from ..core.logging import logger

VT_BASE_URL = "https://www.virustotal.com/api/v3"


def is_vt_configured() -> bool:
    """Check if VirusTotal API key is present."""
    return bool(os.getenv("VIRUSTOTAL_API_KEY", "").strip() or os.getenv("VT_API_KEY", "").strip())


@lru_cache(maxsize=512)
def check_ip_reputation(ip: str) -> Optional[Dict[str, Any]]:
    """Query VirusTotal API v3 for IP address reputation."""
    api_key = os.getenv("VIRUSTOTAL_API_KEY", "").strip() or os.getenv("VT_API_KEY", "").strip()
    if not api_key or not ip:
        return None

    headers = {"x-apikey": api_key}
    try:
        url = f"{VT_BASE_URL}/ip_addresses/{ip}"
        res = requests.get(url, headers=headers, timeout=4)
        if res.status_code == 200:
            data = res.json().get("data", {}).get("attributes", {})
            stats = data.get("last_analysis_stats", {})
            harmless = stats.get("harmless", 0)
            malicious = stats.get("malicious", 0)
            suspicious = stats.get("suspicious", 0)
            return {
                "ip": ip,
                "malicious": malicious,
                "suspicious": suspicious,
                "harmless": harmless,
                "reputation": data.get("reputation", 0),
                "as_owner": data.get("as_owner", "Unknown"),
            }
    except Exception as err:
        logger.warning(f"[VirusTotal] IP check failed for {ip}: {err}")
    return None


@lru_cache(maxsize=512)
def check_url_reputation(target_url: str) -> Optional[Dict[str, Any]]:
    """Query VirusTotal API v3 for URL reputation using base64 URL ID."""
    api_key = os.getenv("VIRUSTOTAL_API_KEY", "").strip() or os.getenv("VT_API_KEY", "").strip()
    if not api_key or not target_url:
        return None

    headers = {"x-apikey": api_key}
    try:
        url_id = base64.urlsafe_b64encode(target_url.encode()).decode().strip("=")
        endpoint = f"{VT_BASE_URL}/urls/{url_id}"
        res = requests.get(endpoint, headers=headers, timeout=4)
        if res.status_code == 200:
            data = res.json().get("data", {}).get("attributes", {})
            stats = data.get("last_analysis_stats", {})
            return {
                "url": target_url,
                "malicious": stats.get("malicious", 0),
                "suspicious": stats.get("suspicious", 0),
                "harmless": stats.get("harmless", 0),
                "title": data.get("title", ""),
            }
    except Exception as err:
        logger.warning(f"[VirusTotal] URL check failed for {target_url}: {err}")
    return None
