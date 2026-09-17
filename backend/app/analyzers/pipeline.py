"""Analysis pipeline: raw email -> parsed -> detected -> scored -> explained -> stored."""

from __future__ import annotations

import hashlib
import re
import uuid
from datetime import datetime, timezone

from ..storage.store import store
from .correlation import recompute_campaigns
from .email_parser import parse_email, TAG_RE
from .explainer import build_explanation
from .live_dns import get_live_dns_intel, get_live_ip_intel
from .scoring import classify, compute_score, phishing_probability
from .threat_engine import run_detectors

MAX_INPUT_BYTES = 2 * 1024 * 1024  # 2 MB upload limit


def analyze_raw(raw: bytes, source: str = 'paste') -> dict:
    if not raw or not raw.strip():
        raise ValueError('The email content is empty. Provide RFC-style email text or a .eml file.')
    if len(raw) > MAX_INPUT_BYTES:
        raise ValueError('Input exceeds the 2 MB limit. Please submit a smaller email.')

    sha1 = hashlib.sha1(raw).hexdigest()
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

    parsed = parse_email(raw)
    indicators, meta = run_detectors(parsed)

    # Real-time Live DNS and IP Intelligence lookup
    sender_domain = parsed.get('sender_domain', '')
    live_dns_data = get_live_dns_intel(sender_domain)
    origin_ip = parsed.get('origin_ip') or (parsed.get('public_ips', [None])[0] if parsed.get('public_ips') else None)
    live_ip_data = get_live_ip_intel(origin_ip) if origin_ip else None

    # If domain has no MX in live DNS and is not a local/example domain, note indicator
    if sender_domain and not sender_domain.endswith(('.example', '.local', '.test', '.invalid')):
        if not live_dns_data.get('has_mx') and live_dns_data.get('status') == 'resolved':
            indicators.append({
                'id': 'live_dns_no_mx',
                'group': 'infrastructure',
                'label': 'Live DNS: No Active MX Records',
                'evidence': f'Live DNS resolution for "{sender_domain}" found no published Mail Exchange (MX) records.',
                'points': 8,
            })

    score = compute_score(indicators)
    classification = classify(score)
    explanation = build_explanation(parsed, indicators, score, classification)

    plain_preview = parsed.get('plain_text', '')
    if not plain_preview.strip() and parsed.get('html'):
        plain_preview = TAG_RE.sub(' ', parsed['html'])
        plain_preview = re.sub(r'\s+', ' ', plain_preview)

    keywords_flat = sorted(set(
        meta['keywords']['urgency'] + meta['keywords']['credential']
        + meta['keywords']['financial']))

    record = {
        'id': uuid.uuid4().hex[:12],
        'sha1': sha1,
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
        'origin_ip': origin_ip,
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
        'body_preview': plain_preview[:1800],
        'risk_score': score,
        'classification': classification,
        'phishing_probability': phishing_probability(classification),
        'threat_type': explanation['threat_type'],
        'explanation': explanation,
        'live_dns': live_dns_data,
        'live_ip': live_ip_data,
        'campaign_id': None,
        'related_ids': [],
        'times_seen': 1,
    }

    store.add_analysis(record)
    recompute_campaigns(store)
    stored = store.get_analysis(record['id'])
    return stored or record


def summarize(a: dict) -> dict:
    return {
        'id': a.get('id'),
        'timestamp': a.get('timestamp'),
        'subject': a.get('subject'),
        'sender': a.get('sender'),
        'sender_domain': a.get('sender_domain', ''),
        'risk_score': a.get('risk_score'),
        'classification': a.get('classification'),
        'campaign_id': a.get('campaign_id'),
        'source': a.get('source', ''),
        'origin_ip': a.get('origin_ip'),
        'live_ip': a.get('live_ip'),
    }


def campaign_detail(campaign: dict) -> dict:
    members = []
    for mid in campaign.get('member_ids', []):
        a = store.get_analysis(mid)
        if a:
            members.append({
                'id': a['id'], 'subject': a['subject'], 'sender': a['sender'],
                'sender_domain': a['sender_domain'], 'local_part': a.get('local_part', ''),
                'reply_to_domain': a.get('reply_to_domain', ''),
                'risk_score': a['risk_score'], 'classification': a['classification'],
                'origin_ip': a.get('origin_ip'), 'public_ips': a.get('public_ips', []),
                'url_domains': a.get('url_domains', []), 'ips': a.get('ips', []),
                'timestamp': a.get('timestamp'),
            })
    detail = dict(campaign)
    detail['members'] = members
    return detail
