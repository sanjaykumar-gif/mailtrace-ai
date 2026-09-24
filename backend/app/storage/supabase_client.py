"""MailTrace AI — Supabase Database Client Layer.
Seamlessly synchronizes forensic analyses, threat campaigns, SOC incidents, and ledger notarizations with Supabase PostgreSQL.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from ..core.config import settings
from ..core.logging import logger


class SupabaseClient:
    """Lightweight, resilient HTTP REST client for Supabase PostgreSQL tables."""

    def __init__(self, url: str = "", key: str = "") -> None:
        self.url = (url or getattr(settings, "SUPABASE_URL", "")).rstrip("/")
        self.key = key or getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "") or getattr(settings, "SUPABASE_KEY", "")
        self.is_configured = bool(self.url and self.key and "your-project-ref" not in self.url)
        if self.is_configured:
            logger.info(f"[Supabase] Connected to project: {self.url}")
        else:
            logger.info("[Supabase] Not configured or using placeholder. Using local atomic storage.")

    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation,resolution=merge-duplicates"
        }

    def _request(self, method: str, table: str, params: dict[str, str] | None = None, data: Any = None) -> Any:
        if not self.is_configured:
            return None

        query_str = f"?{urllib.parse.urlencode(params)}" if params else ""
        full_url = f"{self.url}/rest/v1/{table}{query_str}"
        body_bytes = json.dumps(data).encode("utf-8") if data is not None else None

        req = urllib.request.Request(full_url, data=body_bytes, headers=self._headers(), method=method)
        try:
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                resp_data = resp.read().decode("utf-8")
                return json.loads(resp_data) if resp_data else None
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8")
            logger.warning(f"[Supabase] HTTP {e.code} on {method} {table}: {err_msg}")
            return None
        except Exception as e:
            logger.warning(f"[Supabase] Error accessing {table}: {e}")
            return None

    # --- Analyses ---
    def fetch_analyses(self, limit: int = 100) -> list[dict[str, Any]]:
        res = self._request("GET", "analyses", {"select": "*", "order": "timestamp.desc", "limit": str(limit)})
        return res if isinstance(res, list) else []

    def upsert_analysis(self, analysis: dict[str, Any]) -> bool:
        res = self._request("POST", "analyses", data=analysis)
        return res is not None

    def delete_all_analyses(self) -> bool:
        res = self._request("DELETE", "analyses", {"id": "neq.none"})
        return res is not None

    # --- Campaigns ---
    def fetch_campaigns(self) -> list[dict[str, Any]]:
        res = self._request("GET", "campaigns", {"select": "*", "order": "updated_at.desc"})
        return res if isinstance(res, list) else []

    def upsert_campaign(self, campaign: dict[str, Any]) -> bool:
        res = self._request("POST", "campaigns", data=campaign)
        return res is not None

    def delete_all_campaigns(self) -> bool:
        res = self._request("DELETE", "campaigns", {"id": "neq.none"})
        return res is not None

    # --- Incidents ---
    def fetch_incidents(self) -> list[dict[str, Any]]:
        res = self._request("GET", "incidents", {"select": "*", "order": "created_at.desc"})
        return res if isinstance(res, list) else []

    def upsert_incident(self, incident: dict[str, Any]) -> bool:
        res = self._request("POST", "incidents", data=incident)
        return res is not None

    def update_incident_status(self, incident_id: str, status: str) -> bool:
        res = self._request("PATCH", "incidents", {"id": f"eq.{incident_id}"}, data={"status": status})
        return res is not None

    # --- Ledger ---
    def fetch_ledger(self) -> list[dict[str, Any]]:
        res = self._request("GET", "ledger", {"select": "*", "order": "block_timestamp.desc"})
        return res if isinstance(res, list) else []

    def upsert_ledger_event(self, event: dict[str, Any]) -> bool:
        res = self._request("POST", "ledger", data=event)
        return res is not None

    # --- Evidence ---
    def fetch_evidence(self) -> list[dict[str, Any]]:
        res = self._request("GET", "evidence", {"select": "*", "order": "sealed_at.desc"})
        return res if isinstance(res, list) else []

    def upsert_evidence(self, evidence: dict[str, Any]) -> bool:
        res = self._request("POST", "evidence", data=evidence)
        return res is not None


# Global singleton Supabase client
supabase = SupabaseClient()
