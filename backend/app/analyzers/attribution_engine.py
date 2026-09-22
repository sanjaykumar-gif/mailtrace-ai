"""MailTrace AI — Attribution Support & Confidence Assessment Engine.
Synthesizes email IOCs, IP geolocation, ASN/ISP, Attack DNA, and Campaign telemetry
into an investigative attribution model that separates factual forensic evidence from probabilistic inference.
"""

from __future__ import annotations

from typing import Any


def assess_attribution(
    analysis_dict: dict[str, Any],
    campaign_dict: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Evaluates observed indicators and generates an attribution intelligence profile."""
    indicators = analysis_dict.get("indicators", [])
    geotrace = analysis_dict.get("geotrace", {})
    infra = geotrace.get("infrastructure", {})
    domain = analysis_dict.get("sender_domain", "")
    risk_score = analysis_dict.get("risk_score", 0)

    # 1. Observed Indicators List
    observed = []
    if geotrace.get("earliest_reliable_ip"):
        observed.append(f"Origin IP: {geotrace['earliest_reliable_ip']} ({geotrace.get('isp', 'Unknown ISP')})")
    if domain:
        observed.append(f"Sender Domain: {domain}")
    if analysis_dict.get("url_domains"):
        observed.append(f"Target Infrastructure: {', '.join(analysis_dict['url_domains'][:3])}")
    if campaign_dict:
        observed.append(f"Associated Campaign: {campaign_dict.get('id', 'CAM-001')} ({campaign_dict.get('title', '')})")

    # 2. Possible Origin Type Classifications
    origin_types = []
    auth = analysis_dict.get("auth", {})
    spf = auth.get("spf", {}).get("result", "").lower()
    dmarc = auth.get("dmarc", {}).get("result", "").lower()

    if spf == "fail" or dmarc == "fail":
        origin_types.append("Spoofed Domain Identity (SPF/DMARC Failure)")
    if infra.get("is_known_tor_exit") or infra.get("is_possible_proxy") or infra.get("is_vpn_indicator"):
        origin_types.append("Anonymized / Proxy Transit Infrastructure")
    if infra.get("is_hosting") or infra.get("is_cloud_provider"):
        origin_types.append("Compromised or Bulletproof Cloud VPS Infrastructure")
    if any("homoglyph" in ind.get("id", "") or "lookalike" in ind.get("id", "") for ind in indicators):
        origin_types.append("Adversary-Registered Typosquatting Domain")
    if not origin_types:
        origin_types.append("Direct Originating Mail Relay")

    # 3. Confidence Matrix (Strict Evidence vs Inference Separation)
    infra_conf = "HIGH" if (geotrace.get("earliest_reliable_ip") and infra.get("is_hosting")) else "MEDIUM"
    camp_conf = "HIGH" if (campaign_dict and campaign_dict.get("member_count", 1) >= 2) else ("MEDIUM" if campaign_dict else "LOW")
    sender_id_conf = "LOW"  # Per forensic best practices, headers alone cannot legally identify an individual
    phys_loc = "APPROXIMATE" if geotrace.get("latitude") else "UNKNOWN"

    # 4. Summary narrative
    summary_parts = []
    if campaign_dict and campaign_dict.get("member_count", 1) >= 2:
        summary_parts.append(f"Email is part of a multi-vector cluster ({campaign_dict.get('id')}) sharing common hosting infrastructure and URL targets.")
    elif risk_score >= 60:
        summary_parts.append("Email originates from suspicious or anonymized cloud infrastructure matching known threat actor tooling.")
    else:
        summary_parts.append("Email exhibits legitimate mail routing through standard enterprise gateways.")

    return {
        "observed_indicators": observed,
        "possible_origin_types": origin_types,
        "confidence_matrix": {
            "infrastructure_correlation": infra_conf,
            "campaign_correlation": camp_conf,
            "sender_identity_confidence": sender_id_conf,
            "physical_location": phys_loc,
        },
        "investigative_summary": " ".join(summary_parts),
        "attribution_disclaimer": "Attribution reflects correlated infrastructure clusters and investigative leads. It does not constitute legal proof of personal authorship.",
    }
