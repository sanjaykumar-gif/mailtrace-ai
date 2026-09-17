"""Risk scoring and classification for MailTrace AI."""

from __future__ import annotations

BANDS = [
    (0, 20, 'SAFE'),
    (21, 40, 'LOW'),
    (41, 60, 'MEDIUM'),
    (61, 80, 'HIGH'),
    (81, 100, 'CRITICAL'),
]

PHISHING_PROBABILITY = {
    'SAFE': 'LOW', 'LOW': 'LOW', 'MEDIUM': 'MODERATE',
    'HIGH': 'HIGH', 'CRITICAL': 'VERY HIGH',
}


def compute_score(indicators: list[dict]) -> int:
    total = sum(int(i.get('points', 0)) for i in indicators)
    return max(0, min(total, 100))


def classify(score: int) -> str:
    for lo, hi, label in BANDS:
        if lo <= score <= hi:
            return label
    return 'SAFE'


def phishing_probability(classification: str) -> str:
    return PHISHING_PROBABILITY.get(classification, 'LOW')
