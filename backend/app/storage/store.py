"""
MailTrace AI — Thread-Safe, In-Memory Indexed, Atomic Storage Layer.
"""

from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Any

from ..core.logging import logger

DATA_DIR = Path(__file__).resolve().parents[2] / 'data'
ANALYSES_FILE = DATA_DIR / 'analyses.json'
CAMPAIGNS_FILE = DATA_DIR / 'campaigns.json'
DATA_DIR.mkdir(parents=True, exist_ok=True)


class Store:
    """
    High-performance thread-safe storage engine.
    Maintains synchronized in-memory primary key & SHA1 hash indexes
    for sub-millisecond retrieval, coupled with atomic disk persistence.
    """

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._analyses: dict[str, dict[str, Any]] = {}
        self._sha1_index: dict[str, str] = {}
        self._campaigns: dict[str, dict[str, Any]] = {}
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

            self._loaded = True
            logger.info(
                f"[Storage] Initialized with {len(self._analyses)} analyses "
                f"and {len(self._campaigns)} campaigns in memory."
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
        tmp = path.with_suffix('.tmp')
        try:
            tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
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
        """Returns all analyses as a list ordered by timestamp desc."""
        with self._lock:
            return list(self._analyses.values())

    def get_analysis(self, analysis_id: str) -> dict[str, Any] | None:
        """O(1) memory lookup for an analysis by ID."""
        with self._lock:
            return self._analyses.get(str(analysis_id))

    def find_by_sha1(self, sha1: str) -> dict[str, Any] | None:
        """O(1) memory lookup for deduplicating identical email payloads."""
        with self._lock:
            aid = self._sha1_index.get(str(sha1))
            if aid:
                return self._analyses.get(aid)
            return None

    def add_analysis(self, record: dict[str, Any]) -> None:
        """Adds or updates an analysis and atomically flushes to disk."""
        with self._lock:
            aid = str(record['id'])
            self._analyses[aid] = record
            if 'sha1' in record and record['sha1']:
                self._sha1_index[str(record['sha1'])] = aid
            self._write_json_atomic(ANALYSES_FILE, list(self._analyses.values()))

    def save_analyses(self, analyses: list[dict[str, Any]]) -> None:
        """Batch update analyses in memory and on disk."""
        with self._lock:
            self._analyses = {str(a['id']): a for a in analyses if 'id' in a}
            self._sha1_index = {str(a['sha1']): str(a['id']) for a in analyses if a.get('sha1') and 'id' in a}
            self._write_json_atomic(ANALYSES_FILE, list(self._analyses.values()))

    def delete_analysis(self, analysis_id: str) -> bool:
        """Deletes an analysis by ID."""
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
        """Returns all active campaign clusters."""
        with self._lock:
            return list(self._campaigns.values())

    def get_campaign(self, campaign_id: str) -> dict[str, Any] | None:
        """O(1) memory lookup for a campaign cluster by ID."""
        with self._lock:
            return self._campaigns.get(str(campaign_id))

    def save_campaigns(self, campaigns: list[dict[str, Any]]) -> None:
        """Batch update campaigns in memory and on disk."""
        with self._lock:
            self._campaigns = {str(c['id']): c for c in campaigns if 'id' in c}
            self._write_json_atomic(CAMPAIGNS_FILE, list(self._campaigns.values()))

    def clear(self) -> None:
        """Purges all records from memory and disk."""
        with self._lock:
            self._analyses.clear()
            self._sha1_index.clear()
            self._campaigns.clear()
            self._write_json_atomic(ANALYSES_FILE, [])
            self._write_json_atomic(CAMPAIGNS_FILE, [])
            logger.info("[Storage] Purged all historical records.")


# Singleton store instance
store = Store()
