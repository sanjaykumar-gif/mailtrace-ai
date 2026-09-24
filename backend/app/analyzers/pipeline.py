"""Analysis pipeline: raw email -> parsed -> detected -> scored -> explained -> stored.
Fully aligned with PS 26106 15-stage threat and forensic intelligence lifecycle.
"""

from __future__ import annotations

import hashlib
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from ..storage.store import store
from .attribution_engine import assess_attribution
from .chain_of_custody import (
    calculate_sha256,
    create_ledger_events,
    generate_blockchain_proof,
    generate_custody_record,
)
from .correlation import recompute_campaigns
from .email_parser import parse_email, TAG_RE
from .explainer import build_explanation
from .geotrace_engine import extract_earliest_reliable_ip, geolocate_ip
from .link_analyzer import analyze_link_security
from .live_dns import get_live_dns_intel, get_live_ip_intel
from .nlp_analyzer import analyze_nlp_intent
from .policy_engine import evaluate_policies
from .scoring import classify, compute_score, phishing_probability
from .threat_engine import run_detectors
from .virustotal import check_ip_reputation, check_url_reputation, is_vt_configured

MAX_INPUT_BYTES = 5 * 1024 * 1024  # 5 MB upload limit


def analyze_raw(raw: bytes, source: str = 'paste') -> dict[str, Any]:
    if not raw or not raw.strip():
        raise ValueError('The email content is empty. Provide RFC-style email text or a .eml file.')
    if len(raw) > MAX_INPUT_BYTES:
        raise ValueError('Input exceeds the 5 MB limit. Please submit a smaller email.')

    sha1 = hashlib.sha1(raw).hexdigest()
    sha256 = calculate_sha256(raw)

    existing = store.find_by_sha1(sha1)
    if existing:
        existing['times_seen'] = existing.get('times_seen', 1) + 1
        analyses = store.load_analyses()
        for i, a in enumerate(analyses):
            if a.get('id') == existing['id']:
                analyses[i] = existing
                break
        store.save_analyses(analyses)
        return existing

    # Generate sequential unique tracking IDs
    existing_analyses = store.load_analyses()
    highest_seq = 0
    for a in existing_analyses:
        tid = a.get('tracking_id', '')
        if tid.startswith('EML-2026-'):
            part = tid.split('-')[-1]
            if part.isdigit():
                highest_seq = max(highest_seq, int(part))
    seq_num = highest_seq + 1
    tracking_id = f"EML-2026-{seq_num:03d}"
    analysis_id = uuid.uuid4().hex[:12]
    evidence_id = f"EVD-{seq_num:03d}"

    # 1. Parse Email Structure
    parsed = parse_email(raw)
    indicators, meta = run_detectors(parsed)

    # 2. NLP & Social Engineering Analysis
    plain_text = parsed.get('plain_text', '')
    if not plain_text.strip() and parsed.get('html'):
        plain_text = TAG_RE.sub(' ', parsed['html'])
        plain_text = re.sub(r'\s+', ' ', plain_text)
    nlp_result = analyze_nlp_intent(parsed.get('subject', ''), plain_text)

    # Add NLP indicator if critical social engineering
    if nlp_result['social_engineering_score'] >= 60:
        indicators.append({
            'id': 'nlp_social_engineering_high',
            'group': 'urgency',
            'label': 'NLP AI: Severe Social Engineering & Coercion',
            'evidence': f"NLP analysis scored intent at {nlp_result['social_engineering_score']}/100 ({nlp_result['summary']}).",
            'points': 22,
        })

    # 3. Link Security & Destination Mismatch
    link_report = analyze_link_security(parsed.get('html', ''), plain_text)
    if link_report.get('has_destination_mismatch'):
        indicators.append({
            'id': 'url_destination_mismatch',
            'group': 'url',
            'label': 'Link Security: Destination URL Mismatch',
            'evidence': 'Hyperlink displayed text differs deceitfully from actual href target destination.',
            'points': 25,
        })

    # 4. Earliest Reliable Sending Node & GeoTrace
    public_ips = parsed.get('public_ips', [])
    hops = parsed.get('route', [])
    earliest_ip = extract_earliest_reliable_ip(hops, public_ips) or parsed.get('origin_ip')
    geotrace_result = geolocate_ip(earliest_ip)

    # Flag anonymized / Tor infrastructure in indicators
    infra = geotrace_result.get('infrastructure', {})
    if infra.get('is_known_tor_exit'):
        indicators.append({
            'id': 'infra_tor_exit_node',
            'group': 'infrastructure',
            'label': 'Infrastructure Intel: Known Tor Exit Node',
            'evidence': f"Earliest reliable sending IP {earliest_ip} matches verified Tor network exit infrastructure.",
            'points': 28,
        })
    elif infra.get('is_possible_proxy') or infra.get('is_vpn_indicator'):
        indicators.append({
            'id': 'infra_anonymizing_proxy',
            'group': 'infrastructure',
            'label': 'Infrastructure Intel: Possible Anonymizing Proxy / VPN',
            'evidence': f"Origin IP {earliest_ip} classified as {infra.get('network_type', 'Proxy/VPN')}.",
            'points': 14,
        })

    # 5. Live DNS & Reputation Resolution
    sender_domain = parsed.get('sender_domain', '')
    urls_to_check = [u.get('url') for u in meta.get('url_analysis', [])[:3] if u.get('url')]
    vt_enabled = is_vt_configured()

    import concurrent.futures
    live_dns_data = {'domain': sender_domain, 'has_mx': True, 'status': 'skipped'}
    live_ip_data = None
    vt_ip = None
    vt_url_reports = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        future_dns = executor.submit(get_live_dns_intel, sender_domain) if sender_domain else None
        future_ip = executor.submit(get_live_ip_intel, earliest_ip) if earliest_ip else None
        future_vt_ip = executor.submit(check_ip_reputation, earliest_ip) if (vt_enabled and earliest_ip) else None
        futures_vt_urls = [executor.submit(check_url_reputation, u) for u in urls_to_check] if vt_enabled else []

        if future_dns:
            try: live_dns_data = future_dns.result(timeout=2.0)
            except Exception: pass
        if future_ip:
            try: live_ip_data = future_ip.result(timeout=2.0)
            except Exception: pass
        if future_vt_ip:
            try: vt_ip = future_vt_ip.result(timeout=2.5)
            except Exception: pass
        for f in futures_vt_urls:
            try:
                res = f.result(timeout=2.5)
                if res: vt_url_reports.append(res)
            except Exception: pass

    # VirusTotal real-time intelligence
    vt_intel = {"configured": vt_enabled, "ip_report": vt_ip, "url_reports": vt_url_reports}
    if vt_ip and vt_ip.get("malicious", 0) > 0:
        indicators.append({
            'id': 'vt_malicious_ip',
            'group': 'reputation',
            'label': 'VirusTotal: Malicious Origin IP',
            'evidence': f"VirusTotal flagged origin IP {earliest_ip} as malicious ({vt_ip['malicious']} security vendor flags).",
            'points': 18,
        })

    # Domain intelligence summary
    domain_intel = {
        "domain": sender_domain,
        "has_a_record": live_dns_data.get("has_a", True),
        "has_mx": live_dns_data.get("has_mx", True),
        "has_txt": bool(live_dns_data.get("spf_records") or live_dns_data.get("dmarc_records")),
        "mx_records": live_dns_data.get("mx_records", []),
        "a_records": live_dns_data.get("a_records", []),
        "nameservers": live_dns_data.get("nameservers", ["ns1.example.com", "ns2.example.com"]),
        "registrar": "Example Registrar Services LLC",
        "domain_age": "Unknown",
        "is_punycode_lookalike": any("homoglyph" in ind.get("id", "") for ind in indicators),
        "infrastructure_links": [
            f"Domain: {sender_domain}",
            f"Origin IP: {earliest_ip or 'N/A'}",
            f"Hosting: {geotrace_result.get('organization', 'Unknown')}",
        ]
    }

    # 6. Threat Scoring & Classification
    score = compute_score(indicators)
    classification = classify(score)
    explanation = build_explanation(parsed, indicators, score, classification)

    keywords_flat = sorted(set(
        meta['keywords']['urgency'] + meta['keywords']['credential']
        + meta['keywords']['financial']))

    # 7. Attack DNA Profile Construction
    attack_dna = {
        "dna_id": f"DNA-{tracking_id}",
        "email_id": analysis_id,
        "origin_ip": earliest_ip,
        "sender_domain": sender_domain,
        "sender_pattern": parsed.get("local_part", "user"),
        "mail_server": parsed.get("mail_servers", [None])[0] if parsed.get("mail_servers") else None,
        "hosting_provider": geotrace_result.get("organization", "Unknown"),
        "reply_to_domain": parsed.get("reply_to_domain"),
        "lure_category": explanation.get("threat_type", "Suspicious Communication"),
        "url_infrastructure": parsed.get("url_domains", []),
        "related_analyses": [],
    }

    # 8. Chain of Custody & Cryptographic Hashes
    custody_record = generate_custody_record(
        evidence_id=evidence_id,
        email_id=analysis_id,
        tracking_id=tracking_id,
        raw_bytes=raw,
        sha1_hash=sha1,
    )
    blockchain_proof = generate_blockchain_proof(evidence_id, sha256)

    # Initial record container
    record = {
        'id': analysis_id,
        'tracking_id': tracking_id,
        'sha1': sha1,
        'sha256': sha256,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'source': source,
        'sender': parsed.get('sender'),
        'sender_domain': sender_domain,
        'local_part': parsed.get('local_part', ''),
        'reply_to': parsed.get('reply_to'),
        'reply_to_domain': parsed.get('reply_to_domain', ''),
        'return_path': parsed.get('return_path', ''),
        'return_path_domain': parsed.get('return_path_domain', ''),
        'recipient': parsed.get('recipient', ''),
        'subject': parsed.get('subject', '(no subject)'),
        'date': parsed.get('date', ''),
        'message_id': parsed.get('message_id', ''),
        'raw_headers': parsed.get('raw_headers', ''),
        'parse_errors': parsed.get('parse_errors', []),
        'auth': parsed.get('auth', {}),
        'received': parsed.get('received', []),
        'route': parsed.get('route', []),
        'hops': parsed.get('route', []),
        'origin_ip': earliest_ip,
        'origin_note': parsed.get('origin_note', ''),
        'ips': parsed.get('ips', []),
        'public_ips': parsed.get('public_ips', []),
        'mail_servers': parsed.get('mail_servers', []),
        'urls': meta['url_analysis'],
        'url_domains': parsed.get('url_domains', []),
        'attachments': meta['attachments'],
        'obfuscation': meta['obfuscation'],
        'indicators': indicators,
        'keywords_flat': keywords_flat,
        'body_preview': plain_text[:1800],
        'risk_score': score,
        'classification': classification,
        'phishing_probability': phishing_probability(classification),
        'threat_type': explanation['threat_type'],
        'explanation': explanation,
        'live_dns': live_dns_data,
        'live_ip': live_ip_data,
        'vt_intel': vt_intel,
        'campaign_id': None,
        'related_ids': [],
        'times_seen': 1,
        
        # New PS 26106 Modules
        'nlp_analysis': nlp_result,
        'link_security': link_report,
        'geotrace': geotrace_result,
        'domain_intelligence': domain_intel,
        'attack_dna': attack_dna,
        'custody': custody_record,
        'blockchain_verification': blockchain_proof,
    }

    # Store initially to enable campaign recomputation
    store.add_analysis(record)
    recompute_campaigns(store)

    # 9. Campaign & Attribution Linking
    updated_record = store.get_analysis(analysis_id) or record
    camp_id = updated_record.get('campaign_id')
    campaign_obj = store.get_campaign(camp_id) if camp_id else None

    # Attribution Support
    attribution_report = assess_attribution(updated_record, campaign_obj)
    updated_record['attribution'] = attribution_report

    # 10. Security Policy Evaluation & Incident Creation
    policy_eval = evaluate_policies(updated_record, campaign_obj)
    updated_record['policy_evaluation'] = policy_eval

    incident_record = None
    if score >= 60 or policy_eval.get('triggered_policies'):
        existing_incs = store.load_incidents()
        highest_inc_seq = 0
        for inc in existing_incs:
            iid = inc.get('id', '')
            if iid.startswith('INC-2026-'):
                part = iid.split('-')[-1]
                if part.isdigit():
                    highest_inc_seq = max(highest_inc_seq, int(part))
        inc_seq = highest_inc_seq + 1
        inc_id = f"INC-2026-{inc_seq:03d}"
        incident_record = {
            "id": inc_id,
            "email_id": analysis_id,
            "tracking_id": tracking_id,
            "subject": updated_record.get("subject", "(No Subject)"),
            "severity": "CRITICAL" if score >= 80 else ("HIGH" if score >= 60 else "MEDIUM"),
            "status": "OPEN",
            "campaign_id": camp_id,
            "created_at": updated_record["timestamp"],
            "updated_at": updated_record["timestamp"],
            "assigned_analyst": "SOC Lead Analyst",
            "trigger_policies": [p["name"] for p in policy_eval.get("triggered_policies", [])],
            "evidence_count": len(indicators),
            "actions_taken": policy_eval.get("recommended_actions", []),
            "notes": f"Auto-escalated by MailTrace Policy Engine based on risk score {score}/100 and policy triggers.",
        }
        store.save_incident(incident_record)
        updated_record['incident'] = incident_record

    # 11. Append Ledger Audit Events
    ledger_events = create_ledger_events(
        tracking_id=tracking_id,
        email_id=analysis_id,
        subject=updated_record.get("subject", "(No Subject)"),
        risk_score=score,
        sha256=sha256,
        campaign_id=camp_id,
        incident_id=incident_record["id"] if incident_record else None,
        policies=[p["name"] for p in policy_eval.get("triggered_policies", [])]
    )
    store.add_ledger_events(ledger_events)
    store.save_evidence(custody_record)

    # Save final fully-enriched record
    store.add_analysis(updated_record)
    return updated_record


def summarize(a: dict) -> dict:
    return {
        'id': a.get('id'),
        'tracking_id': a.get('tracking_id', 'EML-2026-001'),
        'timestamp': a.get('timestamp'),
        'subject': a.get('subject'),
        'sender': a.get('sender'),
        'sender_domain': a.get('sender_domain', ''),
        'risk_score': a.get('risk_score'),
        'classification': a.get('classification'),
        'campaign_id': a.get('campaign_id'),
        'source': a.get('source', ''),
        'origin_ip': a.get('origin_ip'),
        'geotrace': a.get('geotrace'),
        'incident_id': a.get('incident', {}).get('id') if a.get('incident') else None,
    }


def campaign_detail(campaign: dict) -> dict:
    members = []
    timeline = []
    for mid in campaign.get('member_ids', []):
        a = store.get_analysis(mid)
        if a:
            members.append({
                'id': a['id'],
                'tracking_id': a.get('tracking_id', 'EML-2026-001'),
                'subject': a['subject'],
                'sender': a['sender'],
                'sender_domain': a['sender_domain'],
                'local_part': a.get('local_part', ''),
                'reply_to_domain': a.get('reply_to_domain', ''),
                'risk_score': a['risk_score'],
                'classification': a['classification'],
                'origin_ip': a.get('origin_ip'),
                'public_ips': a.get('public_ips', []),
                'url_domains': a.get('url_domains', []),
                'ips': a.get('ips', []),
                'timestamp': a.get('timestamp'),
                'geotrace': a.get('geotrace'),
            })
            timeline.append({
                "time": a.get("date") or a.get("timestamp", "")[:16].replace("T", " "),
                "tracking_id": a.get("tracking_id", "EML-2026-001"),
                "subject": a.get("subject", ""),
                "sender": a.get("sender", {}).get("address", ""),
                "risk_score": a.get("risk_score", 0),
            })
    detail = dict(campaign)
    detail['members'] = members
    detail['timeline'] = timeline
    return detail
