"""
RFC-style email parser for MailTrace AI.

Takes raw email bytes, extracts headers, bodies, URLs, IPs, authentication
results and the delivery route (Received chain). Never crashes on malformed
input — missing or broken headers produce empty values plus a parse_errors
list instead of exceptions.
"""

from __future__ import annotations

import ipaddress
import re
from email import policy
from email.parser import BytesParser
from email.utils import parseaddr
from urllib.parse import urlparse

# ----------------------------------------------------------------------
# Regexes
# ----------------------------------------------------------------------
URL_RE = re.compile(r'\b(?:https?|hxxps?)://[^\s<>"\'\)\]\}]+', re.IGNORECASE)
WWW_RE = re.compile(r'\bwww\.[^\s<>"\'\)\]\}]+', re.IGNORECASE)
IP_RE = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
HREF_RE = re.compile(r'href\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
ANCHOR_RE = re.compile(r'<a\b[^>]*href\s*=\s*["\']([^"\']+)["\'][^>]*>(.*?)</a>',
                       re.IGNORECASE | re.DOTALL)
TAG_RE = re.compile(r'<[^>]+>')
HIDDEN_HTML_RE = re.compile(
    r'(display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0|opacity\s*:\s*0|color\s*:\s*(transparent|white\s*!important))',
    re.IGNORECASE)
ZERO_WIDTH_RE = re.compile(r'[​‌‍⁠﻿]')


def normalize_defanged(text: str) -> str:
    """Convert common defanging (hxxp, [.]) back so indicators can be matched."""
    out = re.sub(r'(?i)hxxp', 'http', text)
    out = out.replace('[.]', '.').replace('(.)', '.').replace('[dot]', '.')
    return out


def is_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
        return not (addr.is_private or addr.is_loopback or addr.is_reserved
                    or addr.is_link_local or addr.is_multicast or addr.is_unspecified)
    except ValueError:
        return False


def domain_of_url(url: str) -> str:
    """Return host (netloc) of a URL, tolerant of missing scheme."""
    u = url.strip().rstrip('.,;:')
    if u.lower().startswith('www.'):
        u = 'http://' + u
    try:
        host = urlparse(u).netloc or ''
    except ValueError:
        return ''
    host = host.split('@')[-1].split(':')[0].lower()
    return host


def protocol_of_url(url: str) -> str:
    m = re.match(r'(?i)^(https?|hxxps?|ftp)://', url.strip())
    if m:
        return m.group(1).lower()
    return '(no scheme)'


def addr_domain(address: str) -> str:
    if not address or '@' not in address:
        return ''
    return address.rsplit('@', 1)[-1].strip().lower().rstrip('>')


def _safe_header(msg, name: str) -> str:
    try:
        v = msg.get(name)
        return str(v) if v is not None else ''
    except Exception:
        return ''


def _decode_part(part) -> str:
    try:
        payload = part.get_payload(decode=True)
        if payload is None:
            raw = part.get_payload()
            return raw if isinstance(raw, str) else ''
        charset = part.get_content_charset() or 'utf-8'
        try:
            return payload.decode(charset, errors='replace')
        except (LookupError, UnicodeError):
            return payload.decode('utf-8', errors='replace')
    except Exception:
        return ''


def _parse_identity(header_value: str) -> dict | None:
    if not header_value:
        return None
    try:
        name, addr = parseaddr(header_value)
    except Exception:
        name, addr = '', header_value
    if not addr and not name:
        return None
    return {'name': name or '', 'address': addr or ''}


# ----------------------------------------------------------------------
# Received-header parsing
# ----------------------------------------------------------------------
def parse_received(headers: list[str]) -> list[dict]:
    hops = []
    for idx, raw in enumerate(headers):
        try:
            value = ' '.join(str(raw).split())
        except Exception:
            continue
        from_host = ''
        m = re.search(r'(?i)\bfrom\s+([^\s(;]+)', value)
        if m:
            from_host = m.group(1).strip()
        by_host = ''
        m = re.search(r'(?i)\bby\s+([^\s(;]+)', value)
        if m:
            by_host = m.group(1).strip()
        ip = ''
        for bm in re.finditer(r'\[([^\]]+)\]', value):
            cand = bm.group(1).strip()
            if IP_RE.match(cand):
                ip = cand
                break
        timestamp = ''
        if ';' in value:
            timestamp = value.rsplit(';', 1)[-1].strip()
        hops.append({
            'index': idx,
            'from_host': from_host,
            'from_ip': ip,
            'by_host': by_host,
            'timestamp': timestamp,
            'raw': value[:400],
        })
    return hops


def estimate_origin(hops: list[dict]) -> tuple[str | None, str]:
    """
    Received headers are prepended as the message travels, so the LAST hop in
    the list is closest to the sender. Scan bottom-up for the first public IP.
    """
    for hop in reversed(hops):
        if hop['from_ip'] and is_public_ip(hop['from_ip']):
            return hop['from_ip'], (
                'Estimated from the earliest routable hop in the Received chain. '
                'Headers can be forged by the sender, so treat this as indicative, not proven.')
    return None, 'Origin could not be conclusively determined from the available headers.'


# ----------------------------------------------------------------------
# Authentication-Results parsing
# ----------------------------------------------------------------------
def _auth_status(value: str) -> str:
    v = (value or '').lower()
    if v in ('fail', 'softfail', 'permerror'):
        return 'FAIL'
    if v == 'pass':
        return 'PASS'
    return 'UNKNOWN'


def parse_authentication(msg) -> dict:
    results = {'spf': {'status': 'UNKNOWN', 'raw': 'not reported'},
               'dkim': {'status': 'UNKNOWN', 'raw': 'not reported'},
               'dmarc': {'status': 'UNKNOWN', 'raw': 'not reported'}}
    try:
        headers = msg.get_all('Authentication-Results') or []
    except Exception:
        headers = []
    blob = ' ; '.join(str(hv) for hv in headers)
    if blob:
        for mech in ('spf', 'dkim', 'dmarc'):
            m = re.search(rf'(?i)\b{mech}=(\w+)([^;]*)', blob)
            if m:
                results[mech] = {
                    'status': _auth_status(m.group(1)),
                    'raw': (m.group(1) + m.group(2)).strip()[:160],
                }
    # A present DKIM-Signature that produced no result is still only neutral
    if results['dkim']['status'] == 'UNKNOWN':
        try:
            if msg.get('DKIM-Signature'):
                results['dkim'] = {'status': 'UNKNOWN',
                                   'raw': 'signature present, no verification result'}
        except Exception:
            pass
    return results


# ----------------------------------------------------------------------
# Main entry point
# ----------------------------------------------------------------------
def parse_email(raw: bytes) -> dict:
    parsed: dict = {
        'parse_errors': [],
        'sender': None, 'sender_domain': '', 'local_part': '',
        'reply_to': None, 'reply_to_domain': '',
        'return_path': '', 'return_path_domain': '',
        'recipient': '', 'subject': '(no subject)', 'date': '', 'message_id': '',
        'raw_headers': '',
        'auth': {'spf': {'status': 'UNKNOWN', 'raw': 'not reported'},
                 'dkim': {'status': 'UNKNOWN', 'raw': 'not reported'},
                 'dmarc': {'status': 'UNKNOWN', 'raw': 'not reported'}},
        'received': [], 'route': [], 'origin_ip': None, 'origin_note': '',
        'ips': [], 'public_ips': [], 'mail_servers': [],
        'url_strings': [], 'url_domains': [], 'masked_links': [],
        'attachments': [],
        'plain_text': '', 'html': '', 'has_html': False,
        'zero_width_count': 0, 'hidden_html': False,
    }

    try:
        msg = BytesParser(policy=policy.default).parsebytes(raw)
    except Exception as exc:  # badly malformed — try lenient fallback
        parsed['parse_errors'].append(f'Parser reported: {exc}')
        text = raw.decode('utf-8', errors='replace')
        head, _, body = text.partition('\n\n')
        parsed['plain_text'] = body or text
        _extract_unstructured(parsed, text)
        return parsed

    # ---- identity headers ------------------------------------------------
    try:
        sender = _parse_identity(_safe_header(msg, 'From'))
        parsed['sender'] = sender
        if sender and sender['address']:
            parsed['sender_domain'] = addr_domain(sender['address'])
            parsed['local_part'] = sender['address'].split('@')[0].lower()
    except Exception as exc:
        parsed['parse_errors'].append(f'From header: {exc}')

    try:
        rt = _parse_identity(_safe_header(msg, 'Reply-To'))
        parsed['reply_to'] = rt
        if rt and rt['address']:
            parsed['reply_to_domain'] = addr_domain(rt['address'])
    except Exception as exc:
        parsed['parse_errors'].append(f'Reply-To header: {exc}')

    rp = _safe_header(msg, 'Return-Path').strip()
    parsed['return_path'] = rp
    rpi = _parse_identity(rp)
    if rpi and rpi['address']:
        parsed['return_path_domain'] = addr_domain(rpi['address'])

    parsed['recipient'] = _safe_header(msg, 'To') or '(not specified)'
    parsed['subject'] = _safe_header(msg, 'Subject') or '(no subject)'
    parsed['date'] = _safe_header(msg, 'Date') or '(not specified)'
    parsed['message_id'] = _safe_header(msg, 'Message-ID') or '(not present)'

    # ---- raw headers for the forensic viewer -----------------------------
    try:
        header_lines = [f'{k}: {v}' for k, v in msg.items()]
        parsed['raw_headers'] = '\n'.join(header_lines)[:12000]
    except Exception:
        parsed['raw_headers'] = ''

    # ---- authentication results -------------------------------------------
    try:
        parsed['auth'] = parse_authentication(msg)
    except Exception as exc:
        parsed['parse_errors'].append(f'Authentication-Results: {exc}')

    # ---- bodies & attachments --------------------------------------------
    plain_parts: list[str] = []
    html_parts: list[str] = []
    try:
        parts = msg.walk() if msg.is_multipart() else [msg]
        for part in parts:
            try:
                if part.is_multipart():
                    continue
                ctype = part.get_content_type() or 'application/octet-stream'
                disp = part.get_content_disposition()
                fname = part.get_filename()
                if disp == 'attachment' or fname:
                    try:
                        payload = part.get_payload(decode=True) or b''
                        size = len(payload)
                    except Exception:
                        size = 0
                    parsed['attachments'].append({
                        'filename': fname or '(unnamed attachment)',
                        'content_type': ctype,
                        'size': size,
                    })
                elif ctype == 'text/plain':
                    plain_parts.append(_decode_part(part))
                elif ctype == 'text/html':
                    html_parts.append(_decode_part(part))
            except Exception as exc:
                parsed['parse_errors'].append(f'MIME part: {exc}')
    except Exception as exc:
        parsed['parse_errors'].append(f'MIME walk: {exc}')

    parsed['plain_text'] = '\n'.join(p for p in plain_parts if p)[:20000]
    parsed['html'] = '\n'.join(hv for hv in html_parts if hv)[:40000]
    parsed['has_html'] = bool(parsed['html'].strip())

    # ---- network / route --------------------------------------------------
    try:
        received_raw = [str(x) for x in (msg.get_all('Received') or [])]
    except Exception:
        received_raw = []
    parsed['received'] = parse_received(received_raw)
    parsed['route'] = list(reversed(parsed['received']))  # origin-first order
    parsed['origin_ip'], parsed['origin_note'] = estimate_origin(parsed['received'])

    all_ips: list[str] = []
    for hop in parsed['received']:
        if hop['from_ip']:
            all_ips.append(hop['from_ip'])
    body_ips = IP_RE.findall(parsed['plain_text'] + '\n' + parsed['html'])
    for ip in body_ips:
        if ip not in all_ips:
            all_ips.append(ip)
    parsed['ips'] = all_ips
    parsed['public_ips'] = [ip for ip in all_ips if is_public_ip(ip)]

    servers: list[str] = []
    for hop in parsed['received']:
        for cand in (hop['from_host'], hop['by_host']):
            if cand and not IP_RE.match(cand) and cand.lower() != 'unknown' \
                    and cand not in servers:
                servers.append(cand)
    parsed['mail_servers'] = servers

    # ---- URLs --------------------------------------------------------------
    haystacks = [parsed['plain_text'], TAG_RE.sub(' ', parsed['html']), parsed['html']]
    url_strings: list[str] = []
    for hay in haystacks:
        normalized = normalize_defanged(hay)
        for m in URL_RE.findall(normalized):
            u = m.rstrip('.,;:!?')
            if u not in url_strings:
                url_strings.append(u)
        for m in WWW_RE.findall(normalized):
            u = m.rstrip('.,;:!?')
            if u not in url_strings:
                url_strings.append(u)
    for m in HREF_RE.findall(parsed['html']):
        u = normalize_defanged(m).strip()
        if u.lower().startswith(('http://', 'https://')) and u not in url_strings:
            url_strings.append(u)
    # final dedup by normalized domain+path (avoids duplicates from
    # href-only vs visible-text extraction passes)
    seen_keys: set[str] = set()
    deduped: list[str] = []
    for u in url_strings:
        try:
            key = (domain_of_url(u) + (urlparse(u if '://' in u else 'http://' + u).path or '/')).lower()
        except Exception:
            key = u.lower()
        if key not in seen_keys:
            seen_keys.add(key)
            deduped.append(u)
    parsed['url_strings'] = deduped

    domains: list[str] = []
    for u in url_strings:
        d = domain_of_url(u)
        if d and d not in domains:
            domains.append(d)
    parsed['url_domains'] = domains

    # masked hyperlinks: visible text shows one URL, href points elsewhere
    for href, inner in ANCHOR_RE.findall(parsed['html']):
        visible = TAG_RE.sub('', inner).strip()
        vis_dom = domain_of_url(visible)
        href_dom = domain_of_url(normalize_defanged(href))
        if vis_dom and href_dom and vis_dom != href_dom:
            parsed['masked_links'].append({
                'displayed': visible[:120], 'actual': normalize_defanged(href)[:200]})

    # ---- obfuscation signals ----------------------------------------------
    full_text = parsed['plain_text'] + '\n' + parsed['html']
    literal_zw = len(ZERO_WIDTH_RE.findall(full_text))
    entity_zw = len(re.findall(r'&#(?:8203|8204|8205|8288|x200[B-Db-d]);',
                               parsed['html']))
    parsed['zero_width_count'] = literal_zw + entity_zw
    parsed['hidden_html'] = bool(HIDDEN_HTML_RE.search(parsed['html']))

    return parsed


def _extract_unstructured(parsed: dict, text: str) -> None:
    """Last-resort extraction when the RFC parser cannot handle the input."""
    normalized = normalize_defanged(text)
    parsed['url_strings'] = list(dict.fromkeys(
        u.rstrip('.,;:!?') for u in URL_RE.findall(normalized)))
    parsed['ips'] = list(dict.fromkeys(IP_RE.findall(text)))
    parsed['public_ips'] = [ip for ip in parsed['ips'] if is_public_ip(ip)]
    parsed['origin_note'] = 'Origin could not be conclusively determined from the available headers.'
    m = re.search(r'(?im)^from:\s*(.+)$', text)
    if m:
        sender = _parse_identity(m.group(1))
        parsed['sender'] = sender
        if sender and sender['address']:
            parsed['sender_domain'] = addr_domain(sender['address'])
