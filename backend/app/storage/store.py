"""Simple JSON-file storage for the MVP (no external database needed)."""

from __future__ import annotations

import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[2] / 'data'
ANALYSES_FILE = DATA_DIR / 'analyses.json'
CAMPAIGNS_FILE = DATA_DIR / 'campaigns.json'
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _read(path: Path, default):
    try:
        if path.exists():
            return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        pass
    return default


def _write(path: Path, data) -> None:
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    tmp.replace(path)


class Store:
    # ---- analyses -------------------------------------------------------
    def load_analyses(self) -> list[dict]:
        return _read(ANALYSES_FILE, [])

    def save_analyses(self, analyses: list[dict]) -> None:
        _write(ANALYSES_FILE, analyses)

    def add_analysis(self, record: dict) -> None:
        analyses = self.load_analyses()
        analyses.append(record)
        self.save_analyses(analyses)

    def get_analysis(self, analysis_id: str) -> dict | None:
        for a in self.load_analyses():
            if a.get('id') == analysis_id:
                return a
        return None

    def find_by_sha1(self, sha1: str) -> dict | None:
        for a in self.load_analyses():
            if a.get('sha1') == sha1:
                return a
        return None

    def delete_analysis(self, analysis_id: str) -> bool:
        analyses = self.load_analyses()
        new = [a for a in analyses if a.get('id') != analysis_id]
        if len(new) == len(analyses):
            return False
        self.save_analyses(new)
        return True

    # ---- campaigns ------------------------------------------------------
    def load_campaigns(self) -> list[dict]:
        return _read(CAMPAIGNS_FILE, [])

    def save_campaigns(self, campaigns: list[dict]) -> None:
        _write(CAMPAIGNS_FILE, campaigns)

    def get_campaign(self, campaign_id: str) -> dict | None:
        for c in self.load_campaigns():
            if c.get('id') == campaign_id:
                return c
        return None

    def clear(self) -> None:
        self.save_analyses([])
        self.save_campaigns([])


store = Store()
