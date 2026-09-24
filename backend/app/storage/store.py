"""MailTrace AI — Thread-Safe, In-Memory Indexed, Atomic Storage Layer.
Supports Analyses, Attack Campaigns, Incidents, Forensic Ledger, Chain of Custody, Security Policies, and Privacy Config.
"""

from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..core.logging import logger
from .supabase_client import supabase

DATA_DIR = Path(__file__).resolve().parents[2] / 'data'
ANALYSES_FILE = DATA_DIR / 'analyses.json'
CAMPAIGNS_FILE = DATA_DIR / 'campaigns.json'
INCIDENTS_FILE = DATA_DIR / 'incidents.json'
LEDGER_FILE = DATA_DIR / 'ledger.json'
EVIDENCE_FILE = DATA_DIR / 'evidence.json'
POLICIES_FILE = DATA_DIR / 'policies.json'
PRIVACY_FILE = DATA_DIR / 'privacy.json'

DATA_DIR.mkdir(parents=True, exist_ok=True)


class Store:
    """
    High-performance thread-safe storage engine.
    Maintains synchronized in-memory primary key & SHA1/SHA256 hash indexes
    coupled with atomic disk persistence.
    """

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._analyses: dict[str, dict[str, Any]] = {}
        self._sha1_index: dict[str, str] = {}
        self._campaigns: dict[str, dict[str, Any]] = {}
        self._incidents: dict[str, dict[str, Any]] = {}
        self._ledger_events: list[dict[str, Any]] = []
        self._evidence: dict[str, dict[str, Any]] = {}
        self._policies: list[dict[str, Any]] = []
        self._privacy_config: dict[str, Any] = {
            "mask_pii": True,
            "mask_ips": False,
            "retention_days": 30,
            "audit_logging_enabled": True
        }
        self._loaded = False
        self._init_load()

    def _init_load(self) -> None:
        with self._lock:
            # 1. Load Analyses
            raw_analyses = self._read_json(ANALYSES_FILE, default=[])
            self._analyses.clear()
            self._sha1_index.clear()
            for item in raw_analyses:
                if isinstance(item, dict) and 'id' in item:
                    aid = str(item['id'])
                    self._analyses[aid] = item
                    if 'sha1' in item and item['sha1']:
                        self._sha1_index[str(item['sha1'])] = aid

            # 2. Load Campaigns
            raw_campaigns = self._read_json(CAMPAIGNS_FILE, default=[])
            self._campaigns.clear()
            for c in raw_campaigns:
                if isinstance(c, dict) and 'id' in c:
                    self._campaigns[str(c['id'])] = c

            # 3. Load Incidents
            raw_incidents = self._read_json(INCIDENTS_FILE, default=[])
            self._incidents.clear()
            for inc in raw_incidents:
                if isinstance(inc, dict) and 'id' in inc:
                    self._incidents[str(inc['id'])] = inc

            # 4. Load Ledger Events
            self._ledger_events = self._read_json(LEDGER_FILE, default=[])

            # 5. Load Evidence
            raw_evidence = self._read_json(EVIDENCE_FILE, default=[])
            self._evidence.clear()
            for evd in raw_evidence:
                if isinstance(evd, dict) and 'evidence_id' in evd:
                    self._evidence[str(evd['evidence_id'])] = evd

            # 6. Load Policies
            from ..analyzers.policy_engine import DEFAULT_POLICIES
            self._policies = self._read_json(POLICIES_FILE, default=DEFAULT_POLICIES)

            # 7. Load Privacy Config
            self._privacy_config = self._read_json(PRIVACY_FILE, default=self._privacy_config)

            self._loaded = True
            logger.info(
                f"[Storage] Initialized with {len(self._analyses)} analyses, "
                f"{len(self._campaigns)} campaigns, {len(self._incidents)} incidents, "
                f"and {len(self._ledger_events)} ledger events in memory."
            )

    def _read_json(self, path: Path, default: Any) -> Any:
        try:
            if path.exists():
                text = path.read_text(encoding='utf-8')
                if text.strip():
                    return json.loads(text)
        except Exception as exc:
            logger.warning(f"[Storage] Error reading {path.name}: {exc}. Using fallback.")
        return default

    def _write_json_atomic(self, path: Path, data: Any) -> None:
        import uuid
        tmp = path.with_name(f"{path.stem}_{uuid.uuid4().hex[:8]}.tmp")
        try:
            tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
            for _ in range(3):
                try:
                    tmp.replace(path)
                    break
                except PermissionError:
                    import time
                    time.sleep(0.05)
            else:
                tmp.replace(path)
        except Exception as exc:
            logger.error(f"[Storage] Failed to atomically persist {path.name}: {exc}")
            if tmp.exists():
                try:
                    tmp.unlink()
                except OSError:
                    pass

    # ======================================================================
    # Analyses CRUD
    # ======================================================================

    def load_analyses(self) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._analyses.values())

    def get_analysis(self, analysis_id: str) -> dict[str, Any] | None:
        with self._lock:
            aid = str(analysis_id).strip()
            if aid in self._analyses:
                return self._analyses[aid]
            aid_lower = aid.lower()
            for a in self._analyses.values():
                if str(a.get('tracking_id', '')).lower() == aid_lower:
                    return a
                if str(a.get('id', '')).lower() == aid_lower:
                    return a
                if str(a.get('sha256', '')).lower() == aid_lower:
                    return a
                if str(a.get('sha1', '')).lower() == aid_lower:
                    return a
                rec_id = str(a.get('id', '')).lower()
                rec_track = str(a.get('tracking_id', '')).lower()
                if len(aid_lower) >= 4 and (rec_id.startswith(aid_lower) or rec_track.startswith(aid_lower) or aid_lower in rec_track):
                    return a
            return None

    def find_by_sha1(self, sha1: str) -> dict[str, Any] | None:
        with self._lock:
            aid = self._sha1_index.get(str(sha1))
            if aid:
                return self._analyses.get(aid)
            return None

    def add_analysis(self, record: dict[str, Any]) -> None:
        with self._lock:
            aid = str(record['id'])
            self._analyses[aid] = record
            if 'sha1' in record and record['sha1']:
                self._sha1_index[str(record['sha1'])] = aid
            self._write_json_atomic(ANALYSES_FILE, list(self._analyses.values()))
            if supabase.is_configured:
                threading.Thread(target=supabase.upsert_analysis, args=(record,), daemon=True).start()

    def save_analyses(self, analyses: list[dict[str, Any]]) -> None:
        with self._lock:
            self._analyses = {str(a['id']): a for a in analyses if 'id' in a}
            self._sha1_index = {str(a['sha1']): str(a['id']) for a in analyses if a.get('sha1') and 'id' in a}
            self._write_json_atomic(ANALYSES_FILE, list(self._analyses.values()))
            if supabase.is_configured:
                for a in analyses:
                    threading.Thread(target=supabase.upsert_analysis, args=(a,), daemon=True).start()

    def delete_analysis(self, analysis_id: str) -> bool:
        with self._lock:
            aid = str(analysis_id)
            if aid in self._analyses:
                item = self._analyses.pop(aid)
                if 'sha1' in item and item['sha1'] in self._sha1_index:
                    self._sha1_index.pop(item['sha1'], None)
                self._write_json_atomic(ANALYSES_FILE, list(self._analyses.values()))
                return True
            return False

    # ======================================================================
    # Campaigns CRUD
    # ======================================================================

    def load_campaigns(self) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._campaigns.values())

    def get_campaign(self, campaign_id: str) -> dict[str, Any] | None:
        with self._lock:
            cid = str(campaign_id).strip()
            if cid in self._campaigns:
                return self._campaigns[cid]
            cid_lower = cid.lower()
            for c in self._campaigns.values():
                if str(c.get('id', '')).lower() == cid_lower:
                    return c
                for m in c.get('members', []):
                    if str(m.get('id', '')).lower() == cid_lower or str(m.get('tracking_id', '')).lower() == cid_lower:
                        return c
            return None

    def save_campaigns(self, campaigns: list[dict[str, Any]]) -> None:
        with self._lock:
            self._campaigns = {str(c['id']): c for c in campaigns if 'id' in c}
            self._write_json_atomic(CAMPAIGNS_FILE, list(self._campaigns.values()))
            if supabase.is_configured:
                for c in campaigns:
                    threading.Thread(target=supabase.upsert_campaign, args=(c,), daemon=True).start()

    # ======================================================================
    # Incidents CRUD
    # ======================================================================

    def load_incidents(self) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._incidents.values())

    def get_incident(self, incident_id: str) -> dict[str, Any] | None:
        with self._lock:
            return self._incidents.get(str(incident_id))

    def save_incident(self, incident: dict[str, Any]) -> None:
        with self._lock:
            self._incidents[str(incident['id'])] = incident
            self._write_json_atomic(INCIDENTS_FILE, list(self._incidents.values()))
            if supabase.is_configured:
                threading.Thread(target=supabase.upsert_incident, args=(incident,), daemon=True).start()

    def update_incident(self, incident_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            inc = self._incidents.get(str(incident_id))
            if not inc:
                return None
            inc.update(updates)
            inc["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._incidents[str(incident_id)] = inc
            self._write_json_atomic(INCIDENTS_FILE, list(self._incidents.values()))
            if supabase.is_configured:
                threading.Thread(target=supabase.update_incident_status, args=(incident_id, updates.get("status", "INVESTIGATING")), daemon=True).start()
            return inc

    # ======================================================================
    # Ledger & Evidence
    # ======================================================================

    def load_ledger_events(self) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._ledger_events)

    def add_ledger_events(self, events: list[dict[str, Any]]) -> None:
        with self._lock:
            self._ledger_events.extend(events)
            self._write_json_atomic(LEDGER_FILE, self._ledger_events)
            if supabase.is_configured:
                for ev in events:
                    threading.Thread(target=supabase.upsert_ledger_event, args=(ev,), daemon=True).start()

    def load_evidence(self) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._evidence.values())

    def get_evidence(self, evidence_id: str) -> dict[str, Any] | None:
        with self._lock:
            return self._evidence.get(str(evidence_id))

    def save_evidence(self, evidence_dict: dict[str, Any]) -> None:
        with self._lock:
            self._evidence[str(evidence_dict['evidence_id'])] = evidence_dict
            self._write_json_atomic(EVIDENCE_FILE, list(self._evidence.values()))
            if supabase.is_configured:
                threading.Thread(target=supabase.upsert_evidence, args=(evidence_dict,), daemon=True).start()

    # ======================================================================
    # Policies & Privacy
    # ======================================================================

    def load_policies(self) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._policies)

    def save_policies(self, policies: list[dict[str, Any]]) -> None:
        with self._lock:
            self._policies = policies
            self._write_json_atomic(POLICIES_FILE, self._policies)

    def get_privacy_config(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._privacy_config)

    def set_privacy_config(self, config: dict[str, Any]) -> None:
        with self._lock:
            self._privacy_config.update(config)
            self._write_json_atomic(PRIVACY_FILE, self._privacy_config)

    def clear(self) -> None:
        with self._lock:
            self._analyses.clear()
            self._sha1_index.clear()
            self._campaigns.clear()
            self._incidents.clear()
            self._ledger_events.clear()
            self._evidence.clear()
            self._write_json_atomic(ANALYSES_FILE, [])
            self._write_json_atomic(CAMPAIGNS_FILE, [])
            self._write_json_atomic(INCIDENTS_FILE, [])
            self._write_json_atomic(LEDGER_FILE, [])
            self._write_json_atomic(EVIDENCE_FILE, [])
            if supabase.is_configured:
                threading.Thread(target=supabase.delete_all_analyses, daemon=True).start()
                threading.Thread(target=supabase.delete_all_campaigns, daemon=True).start()
            logger.info("[Storage] Purged all historical records.")


store = Store()
