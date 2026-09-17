"""
Explainability layer for MailTrace AI.

Generates human-readable reasons strictly from detected indicators. An
optional external LLM endpoint may *rephrase* the deterministic summary, but
it only ever receives structured evidence — it never creates indicators.
"""

from __future__ import annotations

import json
import os
import urllib.request

from .scoring import phishing_probability

REASON_TEMPLATES = {
    'reply_to_mismatch': 'The Reply-To address points to a different domain than the sender, so replies would be diverted to another party.',
    'return_path_mismatch': 'The Return-Path (bounce) address belongs to a different domain than the claimed sender.',
    'sender_lookalike': 'The sender domain closely resembles a trusted brand name (look-alike / typosquatting).',
    'sender_tld': 'The sender domain uses a top-level domain frequently associated with low-cost abusive registrations.',
    'reply_to_tld': 'The Reply-To mailbox is hosted on a disposable / high-abuse top-level domain.',
    'display_spoof': 'The display name impersonates a known brand while the actual domain is unrelated.',
    'spf_fail': 'SPF authentication failed — the sending server is not authorized for the sender domain.',
    'dkim_fail': 'The DKIM signature check failed — the message was not validly signed by the claimed domain.',
    'dmarc_fail': 'DMARC policy validation failed — the domain owner’s policy treats this message as unauthorized.',
    'suspicious_url': 'The email contains one or more URLs with suspicious properties (look-alike domain, credential-style path, IP host, shortener or high-abuse TLD).',
    'masked_link': 'A hyperlink’s visible text does not match its real destination (masked link).',
    'urgency': 'The message uses urgency or pressure language to rush the recipient into acting.',
    'credential': 'The message asks the recipient to verify credentials or account information.',
    'financial': 'The message requests a payment, transfer, gift cards or other financial action.',
    'attach_dangerous': 'The email carries an attachment of a dangerous executable/script type.',
    'attach_risky': 'The email carries an attachment type that can contain active or deceptive content.',
    'zero_width': 'Invisible zero-width characters were found in the content (filter evasion).',
    'homoglyph': 'Unicode look-alike characters appear in a domain (visual spoofing).',
    'hidden_html': 'Hidden HTML elements were found in the message body.',
    'defanged': 'URLs were deliberately rewritten (hxxp / [.]) to evade link scanners.',
}

RECOMMENDED_ACTIONS = {
    'CRITICAL': 'Do not click links, open attachments or provide credentials. Report the message to your security administrator immediately.',
    'HIGH': 'Treat the email as suspicious. Verify the sender through an independent, known channel before taking any action.',
    'MEDIUM': 'Review the sender, links and authentication information carefully before interacting with this message.',
    'LOW': 'Minor indicators were found. Exercise normal caution with links and attachments.',
    'SAFE': 'No significant indicators were detected. Continue to exercise normal caution.',
}


def guess_threat_type(indicators: list[dict]) -> str:
    ids = {i['id'] for i in indicators}
    if 'attach_dangerous' in ids:
        return 'malware delivery'
    if 'credential' in ids and ('suspicious_url' in ids or 'masked_link' in ids):
        return 'credential phishing'
    if 'financial' in ids:
        return 'financial fraud / business email compromise (BEC) attempt'
    if 'credential' in ids:
        return 'credential harvesting'
    if 'sender_lookalike' in ids or 'display_spoof' in ids:
        return 'impersonation / brand-spoofing attempt'
    return 'phishing or social-engineering attempt'


def _optional_llm_summary(evidence: dict) -> str | None:
    """Optional LLM rephrase. Only used if env vars are configured; safe to fail."""
    endpoint = os.environ.get('MAILTRACE_LLM_ENDPOINT')
    key = os.environ.get('MAILTRACE_LLM_KEY')
    if not endpoint or not key:
        return None
    prompt = (
        'You are an email-security analyst. Using ONLY the evidence below, write '
        'a short (3-4 sentences) plain-language explanation of why this email was '
        'flagged. Do not invent any new indicators.\n\n'
        f'EVIDENCE:\n{json.dumps(evidence, indent=1)}')
    try:
        req = urllib.request.Request(
            endpoint,
            data=json.dumps({'prompt': prompt}).encode(),
            headers={'Authorization': f'Bearer {key}',
                     'Content-Type': 'application/json'},
            method='POST')
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
            text = data.get('text') or data.get('summary') or ''
            return text.strip() or None
    except Exception:
        return None


def build_explanation(parsed: dict, indicators: list[dict], score: int,
                      classification: str) -> dict:
    reasons: list[dict] = []
    for ind in sorted(indicators, key=lambda x: -x['points']):
        text = REASON_TEMPLATES.get(ind['id'], ind['label'])
        reasons.append({
            'reason': text,
            'evidence': ind['evidence'],
            'points': ind['points'],
            'group': ind['group'],
        })

    threat_type = guess_threat_type(indicators) if indicators else ''
    if classification in ('CRITICAL', 'HIGH'):
        conclusion = (f'{len(indicators)} independent indicators collectively '
                      f'suggest this email may be a {threat_type}.')
    elif classification == 'MEDIUM':
        conclusion = (f'Several indicators ({len(indicators)}) were found that '
                      f'may relate to a {threat_type or "suspicious pattern"}; '
                      f'manual verification is advised.')
    elif classification == 'LOW':
        conclusion = ('Only minor indicators were detected; this message is '
                      'probably legitimate but warrants basic caution.')
    else:
        conclusion = ('No meaningful threat indicators were detected in the '
                      'available email evidence.')

    summary = (
        f'MailTrace AI assigned a risk score of {score}/100 ({classification}). '
        f'The rule-based engine identified {len(indicators)} forensic indicator(s) '
        f'across identity, authentication, content, links and infrastructure. '
        f'{conclusion} This assessment is evidence-based and explainable — it is '
        f'a risk evaluation, not an absolute guarantee.')

    llm_text = _optional_llm_summary({
        'risk_score': score, 'classification': classification,
        'indicators': [{'label': i['label'], 'evidence': i['evidence']}
                       for i in indicators],
    })
    if llm_text:
        summary = llm_text + '\n\n(LLM rephrasing of the deterministic evidence above.)'

    return {
        'summary': summary,
        'reasons': reasons,
        'conclusion': f'Conclusion: {conclusion}',
        'recommended_action': RECOMMENDED_ACTIONS[classification],
        'phishing_probability': phishing_probability(classification),
        'threat_type': threat_type,
    }
