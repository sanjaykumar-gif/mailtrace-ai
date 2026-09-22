"""MailTrace AI — Natural Language Processing & Social Engineering Analyzer.
Analyzes email body & subject for urgency, credential harvesting, financial manipulation,
executive impersonation, and psychological coercion.
"""

from __future__ import annotations

import re
from typing import Any

# Psychological and linguistic heuristics for phishing & BEC
URGENCY_PATTERNS = [
    (r"\b(immediately|urgent|action required|suspended within \d+|account termination|24 hours|expire in|final notice|immediate response|limited time|act now)\b", 25, "Critical Urgency Deadline"),
    (r"\b(warning|security alert|unauthorized login|compromised|lockout|breach detected|unusual activity)\b", 20, "Threat / Lockout Pressure"),
    (r"\b(do not ignore|respond instantly|critical update|immediate attention)\b", 15, "Coercive Pressure"),
]

CREDENTIAL_PATTERNS = [
    (r"\b(verify your password|enter your credentials|confirm your account|login to verify|update your security details|click here to login|sign in to prevent)\b", 35, "Direct Credential Request"),
    (r"\b(re-enter your pin|2fa code|security token|verify identity|reactivate your account)\b", 30, "Authentication Token Solicitation"),
    (r"\b(password expired|reset credentials|security verification)\b", 20, "Password Renewal Lure"),
]

FINANCIAL_PATTERNS = [
    (r"\b(wire transfer|bank account|direct deposit|payroll|routing number|invoice attached|overdue payment|swift transfer|bitcoin|crypto wallet)\b", 35, "Direct Financial / Wire Request"),
    (r"\b(remittance|tax refund|compensation|gift card|procurement invoice|reimbursement)\b", 25, "Financial Incentive / Invoice Lure"),
    (r"\b(confidential settlement|fund transfer|escrow payment)\b", 20, "Confidential Transaction"),
]

IMPERSONATION_PATTERNS = [
    (r"\b(sent from my iphone|sent from mobile|i am in a meeting|do not call me|keep this confidential|executive office|ceo|cfo|director)\b", 30, "Executive / Authority Isolation Lure"),
    (r"\b(it support team|helpdesk notification|security desk|microsoft support|google workspace admin|system administrator)\b", 25, "IT / System Admin Impersonation"),
    (r"\b(human resources|hr department|compliance officer)\b", 20, "HR / Policy Coercion"),
]


def analyze_nlp_intent(subject: str, body_text: str) -> dict[str, Any]:
    """Runs rule-based and linguistic scoring on email text and subject."""
    full_text = f"{subject}\n{body_text}".lower()

    # 1. Urgency Language
    urgency_cues = []
    urgency_raw = 0
    for pattern, weight, label in URGENCY_PATTERNS:
        matches = re.findall(pattern, full_text, re.IGNORECASE)
        if matches:
            urgency_raw += weight
            urgency_cues.append(f"{label}: '{matches[0]}'")
    urgency_score = min(100, urgency_raw)
    urgency_level = "CRITICAL" if urgency_score >= 70 else "HIGH" if urgency_score >= 45 else "MEDIUM" if urgency_score >= 20 else "LOW"

    # 2. Credential Harvesting
    cred_cues = []
    cred_raw = 0
    for pattern, weight, label in CREDENTIAL_PATTERNS:
        matches = re.findall(pattern, full_text, re.IGNORECASE)
        if matches:
            cred_raw += weight
            cred_cues.append(f"{label}: '{matches[0]}'")
    cred_score = min(100, cred_raw)
    cred_level = "CRITICAL" if cred_score >= 70 else "HIGH" if cred_score >= 45 else "MEDIUM" if cred_score >= 20 else "LOW"

    # 3. Financial Manipulation
    fin_cues = []
    fin_raw = 0
    for pattern, weight, label in FINANCIAL_PATTERNS:
        matches = re.findall(pattern, full_text, re.IGNORECASE)
        if matches:
            fin_raw += weight
            fin_cues.append(f"{label}: '{matches[0]}'")
    fin_score = min(100, fin_raw)
    fin_level = "CRITICAL" if fin_score >= 70 else "HIGH" if fin_score >= 45 else "MEDIUM" if fin_score >= 20 else "LOW"

    # 4. Impersonation Language
    imp_cues = []
    imp_raw = 0
    for pattern, weight, label in IMPERSONATION_PATTERNS:
        matches = re.findall(pattern, full_text, re.IGNORECASE)
        if matches:
            imp_raw += weight
            imp_cues.append(f"{label}: '{matches[0]}'")
    imp_score = min(100, imp_raw)
    imp_level = "CRITICAL" if imp_score >= 70 else "HIGH" if imp_score >= 45 else "MEDIUM" if imp_score >= 20 else "LOW"

    # Composite Social Engineering Score
    social_engineering_score = min(100, int(
        (urgency_score * 0.25) +
        (cred_score * 0.35) +
        (fin_score * 0.20) +
        (imp_score * 0.20)
    ))

    # Summary narrative
    findings = []
    if urgency_level in ("HIGH", "CRITICAL"):
        findings.append("High-pressure psychological urgency detected")
    if cred_level in ("HIGH", "CRITICAL"):
        findings.append("Suspicious credential solicitation identified")
    if fin_level in ("HIGH", "CRITICAL"):
        findings.append("Financial manipulation / wire request cues detected")
    if imp_level in ("HIGH", "CRITICAL"):
        findings.append("Executive/IT authority impersonation language observed")

    if not findings:
        summary = "No overt linguistic coercion or social engineering cues detected."
    else:
        summary = "; ".join(findings) + "."

    return {
        "urgency_language": {
            "score": urgency_score,
            "level": urgency_level,
            "cues_detected": urgency_cues,
        },
        "credential_harvesting": {
            "score": cred_score,
            "level": cred_level,
            "cues_detected": cred_cues,
        },
        "financial_manipulation": {
            "score": fin_score,
            "level": fin_level,
            "cues_detected": fin_cues,
        },
        "impersonation_language": {
            "score": imp_score,
            "level": imp_level,
            "cues_detected": imp_cues,
        },
        "social_engineering_score": social_engineering_score,
        "summary": summary,
    }
