"""MailTrace AI — Enterprise Security Policy & Incident Evaluator.
Evaluates email threat characteristics against defined corporate security policies
and triggers automated mitigation playbooks (Quarantine, Admin Alert, Domain Block, Incident Creation).
"""

from __future__ import annotations

from typing import Any

# Default Built-in Security Policies
DEFAULT_POLICIES = [
    {
        "id": "POL-EXEC-IMPERSONATION",
        "name": "Executive / VIP Impersonation Defense",
        "description": "Triggered when sender display name matches executive leadership but sending domain fails authentication.",
        "enabled": True,
        "condition_summary": "Display Name matches VIP AND (DMARC=FAIL OR SPF=FAIL OR Reply-To Mismatch)",
        "recommended_action": "QUARANTINE",
    },
    {
        "id": "POL-CREDENTIAL-HARVEST",
        "name": "Zero-Trust Credential Theft Prevention",
        "description": "Triggered when email contains high-urgency credential harvesting lures or link destination mismatches.",
        "enabled": True,
        "condition_summary": "Credential NLP Score >= 50 OR Destination Mismatch = TRUE",
        "recommended_action": "QUARANTINE",
    },
    {
        "id": "POL-FINANCIAL-WIRE",
        "name": "BEC & Wire Fraud Safeguard",
        "description": "Triggered when email requests bank transfers, payroll updates, or swift payments with external origin.",
        "enabled": True,
        "condition_summary": "Financial NLP Score >= 50 AND Sender is External",
        "recommended_action": "ADMIN_ALERT",
    },
    {
        "id": "POL-MALICIOUS-INFRA",
        "name": "Anonymized / Tor Relay Ingress Filter",
        "description": "Triggered when sending IP is geolocated to known Tor exit nodes, anonymizing proxies, or bulletproof hosters.",
        "enabled": True,
        "condition_summary": "IP is Known Tor Exit OR High Risk Score >= 80",
        "recommended_action": "BLOCK_DOMAIN",
    },
    {
        "id": "POL-COORDINATED-CAMPAIGN",
        "name": "Coordinated Attack Campaign Ingress",
        "description": "Triggered when incoming message correlates with an active Attack DNA cluster or campaign >= 80% confidence.",
        "enabled": True,
        "condition_summary": "Campaign Member Count >= 2 AND Campaign Confidence >= 75%",
        "recommended_action": "ADMIN_ALERT",
    },
]


def evaluate_policies(
    analysis_dict: dict[str, Any],
    campaign_dict: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Evaluates all enabled policies against the current email analysis."""
    triggered_policies = []
    actions = set()

    risk_score = analysis_dict.get("risk_score", 0)
    nlp = analysis_dict.get("nlp_analysis", {})
    links = analysis_dict.get("link_security", {})
    geotrace = analysis_dict.get("geotrace", {})
    infra = geotrace.get("infrastructure", {}) if geotrace else {}
    auth = analysis_dict.get("auth", {})

    cred_score = nlp.get("credential_harvesting", {}).get("score", 0) if nlp else 0
    fin_score = nlp.get("financial_manipulation", {}).get("score", 0) if nlp else 0
    has_mismatch = links.get("has_destination_mismatch", False) if links else False
    is_tor_or_proxy = infra.get("is_known_tor_exit") or infra.get("is_possible_proxy")

    # 1. Executive Impersonation
    if any("impersonat" in ind.get("id", "") or "reply_to_mismatch" in ind.get("id", "") for ind in analysis_dict.get("indicators", [])):
        triggered_policies.append(DEFAULT_POLICIES[0])
        actions.add(DEFAULT_POLICIES[0]["recommended_action"])

    # 2. Credential Harvest
    if cred_score >= 45 or has_mismatch or any("credential" in ind.get("id", "") for ind in analysis_dict.get("indicators", [])):
        triggered_policies.append(DEFAULT_POLICIES[1])
        actions.add(DEFAULT_POLICIES[1]["recommended_action"])

    # 3. Financial Wire
    if fin_score >= 45 or any("financial" in ind.get("id", "") or "urgency" in ind.get("id", "") for ind in analysis_dict.get("indicators", [])):
        triggered_policies.append(DEFAULT_POLICIES[2])
        actions.add(DEFAULT_POLICIES[2]["recommended_action"])

    # 4. Malicious Infrastructure / High Risk
    if is_tor_or_proxy or risk_score >= 80:
        triggered_policies.append(DEFAULT_POLICIES[3])
        actions.add(DEFAULT_POLICIES[3]["recommended_action"])

    # 5. Coordinated Campaign
    if campaign_dict and campaign_dict.get("member_count", 0) >= 2 and campaign_dict.get("confidence", 0) >= 70:
        triggered_policies.append(DEFAULT_POLICIES[4])
        actions.add(DEFAULT_POLICIES[4]["recommended_action"])

    action_list = list(actions) if actions else ["LOG_AUDIT"]
    quarantine = "QUARANTINE" in action_list
    admin_alert = "ADMIN_ALERT" in action_list or "BLOCK_DOMAIN" in action_list or quarantine

    return {
        "triggered_policies": triggered_policies,
        "recommended_actions": action_list,
        "quarantine_recommended": quarantine,
        "admin_alert_required": admin_alert,
    }
