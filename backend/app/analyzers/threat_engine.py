"""
Rule-based threat detection engine for MailTrace AI.

Every detector produces structured, explainable indicators with an evidence
string. Nothing is fabricated: detectors only report what is actually present
in the parsed email.
"""

from __future__ import annotations

import re
from urllib.parse import urlparse

from .email_parser import IP_RE, domain_of_url, is_public_ip, TAG_RE, ZERO_WIDTH_RE

# ----------------------------------------------------------------------
# Reference data
# ----------------------------------------------------------------------
BRANDS = [
    'paypal', 'apple', 'microsoft', 'google', 'gmail', 'outlook', 'amazon',
    'netflix', 'facebook', 'instagram', 'linkedin', 'dropbox', 'chase',
    'wellsfargo', 'bankofamerica', 'citibank', 'hsbc', 'icici', 'hdfc',
    'sbi', 'axisbank', 'irctc', 'dhl', 'fedex', 'ups', 'usps', 'coinbase',
    'binance', 'metamask', 'steam', 'adobe', 'zoom', 'slack', 'yahoo',
]

SUSPICIOUS_TLDS = {
    'tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'club', 'work', 'click',
    'link', 'cfd', 'icu', 'monster', 'buzz', 'rest', 'fit',
}

SHORTENER_RE = re.compile(
    r'(?i)(^|\.)(bit\.ly|tinyurl|tiny\.cc|shorturl|cutt\.ly|rb\.gy|ow\.ly|'
    r'is\.gd|t\.co|goo\.gl|buff\.ly|rebrand\.ly|shorte\.st|adf\.ly)($|\.)')

CRED_PATH_RE = re.compile(
    r'/(login|signin|sign-in|verify|verification|validate|account|confirm|'
    r'unlock|update|billing|wallet|password|passwd|reset|secure|webscr|auth|'
    r'recover|restore)(/|\?|$)', re.IGNORECASE)

URGENCY_PHRASES = [
    'urgent', 'immediately', 'act now', 'expires', 'within 24 hours',
    'final notice', 'last warning', 'account suspended', 'has been suspended',
    'temporarily suspended', 'unusual activity', 'security alert',
    'limited time', 'before 5 pm', 'right away', 'as soon as possible',
    'action required', 'verify immediately', 'overdue', 'will be closed',
    'will be locked', 'permanently restricted', 'failure to comply',
]

CREDENTIAL_PHRASES = [
    'verify your account', 'confirm your password', 'update your payment',
    're-enter your password', 'confirm your identity', 'validate your account',
    'account verification', 'login credentials', 'enter your password',
    'confirm your account', 'update your account', 'sign in to restore',
    'one-time password', 'verify now', 'unlock your account',
    'confirm your details', 'security question',
]

FINANCIAL_PHRASES = [
    'wire transfer', 'gift card', 'gift cards', 'bitcoin', 'crypto',
    'payment required', 'overdue payment', 'outstanding invoice',
    'process the payment', 'bank details', 'account number',
    'western union', 'urgent payment', 'outstanding balance',
    'purchase cards', 'itunes', 'google play card', 'settle the amount',
    'final invoice', 'invoice attached', 'payment of', 'fund transfer',
]

DANGEROUS_EXTS = {
    'exe', 'scr', 'bat', 'cmd', 'com', 'pif', 'vbs', 'vbe', 'js', 'jse',
    'wsf', 'wsh', 'ps1', 'msi', 'jar', 'lnk', 'iso', 'img', 'dll', 'hta',
    'cpl', 'reg',
}
RISKY_EXTS = {'html', 'htm', 'docm', 'xlsm', 'pptm', 'zip', 'rar', '7z', 'ace', 'apk'}

COMMON_LOCAL_PARTS = {
    'support', 'billing', 'account', 'accounts', 'security', 'secure',
    'noreply', 'no-reply', 'service', 'services', 'helpdesk', 'help',
    'info', 'admin', 'team', 'office', 'alert', 'alerts', 'invoice',
    'payment', 'payments', 'verify', 'verification', 'update', 'care',
    'customer', 'customercare', 'desk', 'notice', 'notification',
}

SUBST_MAP = str.maketrans({
    '0': 'o', '1': 'l', '3': 'e', '5': 's', '7': 't', '4': 'a', '8': 'b',
    '$': 's', '@': 'a', '!': 'i', '+': 't',
})


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def second_level_label(domain: str) -> str:
    parts = [p for p in domain.lower().strip('.').split('.') if p]
    if len(parts) >= 2:
        return parts[-2]
    return parts[0] if parts else ''


def tld_of(domain: str) -> str:
    parts = domain.lower().strip('.').split('.')
    return parts[-1] if parts else ''


def brand_lookalike(domain: str) -> tuple[str, str] | None:
    """Detect lookalike domains. Returns (detail, kind) or None."""
    if not domain:
        return None
    d = domain.lower().strip('.')
    parts = [p for p in d.split('.') if p]
    if len(parts) < 2:
        return None
    registrable = '.'.join(parts[-2:])  # last two labels, e.g. paypal.com
    name = parts[-2]
    tld = parts[-1]
    if not name:
        return None
    substituted = name.translate(SUBST_MAP)
    for brand in BRANDS:
        # legitimately operated domain such as "paypal.com" / "www.paypal.com"
        if registrable == f'{brand}.{tld}':
            return None
        if name == brand or substituted == brand:
            return None
        if brand in name:
            return (f'domain embeds the brand name "{brand}" '
                    f'inside "{registrable}"', 'brand-in-domain')
        if brand in substituted:
            return (f'character substitution in "{name}" visually imitates '
                    f'"{brand}" (e.g. digit/letter swapping)', 'substitution')
        if 1 <= levenshtein(name, brand) <= 2 and len(name) >= 4 \
                and abs(len(name) - len(brand)) <= 2:
            return (f'"{name}" is {levenshtein(name, brand)} edit(s) away from '
                    f'the brand "{brand}"', 'typosquat')
    return None


# ----------------------------------------------------------------------
# Individual detectors
# ----------------------------------------------------------------------
def _mk(ind_id, group, label, points, evidence):
    return {'id': ind_id, 'group': group, 'label': label,
            'points': points, 'evidence': evidence}


def detect_identity(parsed, indicators):
    sd = parsed.get('sender_domain', '')
    sender = parsed.get('sender') or {}

    if parsed.get('reply_to_domain') and sd and \
            parsed['reply_to_domain'] != sd:
        indicators.append(_mk(
            'reply_to_mismatch', 'Identity', 'Reply-To mismatch', 18,
            f'Replies would go to **{parsed["reply_to_domain"]}**, not to the '
            f'sender domain **{sd}** — a common way to hijack conversations.'))

    if parsed.get('return_path_domain') and sd and \
            parsed['return_path_domain'] != sd:
        indicators.append(_mk(
            'return_path_mismatch', 'Identity', 'Return-Path mismatch', 10,
            f'Bounces are routed to **{parsed["return_path_domain"]}** while the '
            f'message claims to be from **{sd}**.'))

    if sd:
        look = brand_lookalike(sd)
        if look:
            detail, kind = look
            indicators.append(_mk(
                'sender_lookalike', 'Identity', 'Sender domain resembles a trusted brand', 12,
                f'Sender domain **{sd}**: {detail}.'))
        if tld_of(sd) in SUSPICIOUS_TLDS:
            indicators.append(_mk(
                'sender_tld', 'Identity', 'Sender uses a high-abuse TLD', 8,
                f'"{sd}" ends in **.{tld_of(sd)}**, a TLD frequently used in '
                f'low-cost bulk abuse.'))

    # display-name spoofing: display name says a brand, domain is unrelated
    disp = (sender.get('name') or '').lower()
    if disp and sd:
        for brand in BRANDS:
            if re.search(rf'\b{re.escape(brand)}\b', disp) and brand not in sd:
                indicators.append(_mk(
                    'display_spoof', 'Identity', 'Display-name impersonation', 12,
                    f'The display name says **"{sender.get("name")}"** but the '
                    f'actual domain **{sd}** is unrelated to "{brand}".'))
                break

    # reply-to hosted on a disposable/high-abuse TLD
    if parsed.get('reply_to_domain') and \
            tld_of(parsed['reply_to_domain']) in SUSPICIOUS_TLDS:
        indicators.append(_mk(
            'reply_to_tld', 'Identity', 'Reply-To on high-abuse TLD', 8,
            f'Replies would go to **{parsed["reply_to_domain"]}**, hosted on '
            f'**.{tld_of(parsed["reply_to_domain"])}** — a TLD frequently used '
            f'for throwaway fraud mailboxes.'))


def detect_authentication(parsed, indicators):
    auth = parsed.get('auth', {})
    grp_pts = 0
    spf = auth.get('spf', {}).get('status', 'UNKNOWN')
    dkim = auth.get('dkim', {}).get('status', 'UNKNOWN')
    dmarc = auth.get('dmarc', {}).get('status', 'UNKNOWN')
    if spf == 'FAIL':
        grp_pts += 10
        indicators.append(_mk('spf_fail', 'Authentication', 'SPF authentication failed', 10,
                              f'SPF result: `{auth["spf"]["raw"]}` — the sending server '
                              f'is not authorized for this domain.'))
    if dkim == 'FAIL':
        grp_pts += 8
        indicators.append(_mk('dkim_fail', 'Authentication', 'DKIM signature failed', 8,
                              f'DKIM result: `{auth["dkim"]["raw"]}` — the message was '
                              f'not validly signed.'))
    if dmarc == 'FAIL':
        grp_pts += 10
        indicators.append(_mk('dmarc_fail', 'Authentication', 'DMARC policy failed', 10,
                              f'DMARC result: `{auth["dmarc"]["raw"]}` — the domain '
                              f'owner\'s policy considers this message unauthorized.'))
    # cap the authentication group at +20 (authentication failure ≤ 20)
    if grp_pts > 20:
        for ind in indicators:
            if ind['group'] == 'Authentication':
                ind['points'] = round(ind['points'] * 20 / grp_pts)
        indicators.append(_mk('auth_capped', 'Authentication', 'Authentication group cap', 0,
                              'Combined authentication penalty capped at +20 to avoid '
                              'double counting.'))


def analyze_single_url(url: str) -> dict:
    """Per-URL analysis. Never visits the URL — static inspection only."""
    reasons: list[dict] = []
    domain_reasons = 0
    context_reasons = 0
    dom = domain_of_url(url)
    proto = 'https' if url.lower().startswith('https') else \
        ('http' if url.lower().startswith(('http://', 'hxxp')) else '(none)')
    if dom and IP_RE.match(dom):
        reasons.append({'label': 'URL points at a raw IP address', 'points': 12})
        domain_reasons += 1
    if dom:
        look = brand_lookalike(dom)
        if look:
            reasons.append({'label': f'look-alike domain ({look[0]})', 'points': 15})
            domain_reasons += 1
        if SHORTENER_RE.search(dom):
            reasons.append({'label': 'URL shortener hides the real destination', 'points': 10})
            domain_reasons += 1
        if tld_of(dom) in SUSPICIOUS_TLDS:
            reasons.append({'label': f'high-abuse TLD .{tld_of(dom)}', 'points': 8})
            domain_reasons += 1
        if 'xn--' in dom:
            reasons.append({'label': 'punycode domain (possible homoglyph attack)', 'points': 10})
            domain_reasons += 1
        if dom.count('.') >= 4:
            reasons.append({'label': 'excessive subdomains (obfuscation tactic)', 'points': 5})
            domain_reasons += 1
    try:
        path = urlparse(url if '://' in url else 'http://' + url).path or ''
    except ValueError:
        path = ''
    if CRED_PATH_RE.search(path):
        reasons.append({'label': 'credential-style path '
                                 f'({CRED_PATH_RE.search(path).group(0).strip("/?")})',
                        'points': 6})
        context_reasons += 1
    if proto == 'http':
        reasons.append({'label': 'unencrypted HTTP link in an email', 'points': 4})
        context_reasons += 1
    if url.count('%') >= 3:
        reasons.append({'label': 'heavy percent-encoding (obfuscation)', 'points': 4})
        context_reasons += 1
    # A path/word-level quirk alone (e.g. a legitimate /login page) does not
    # make a URL suspicious — domain-level evidence or a combination does.
    suspicious = domain_reasons > 0 or context_reasons >= 2
    return {'url': url, 'domain': dom or '(unparseable)', 'protocol': proto,
            'suspicious': suspicious, 'reasons': reasons}


def detect_urls(parsed, indicators) -> list[dict]:
    analyzed = [analyze_single_url(u) for u in parsed.get('url_strings', [])]
    url_pts = 0
    flagged = []
    for a in analyzed:
        if a['suspicious']:
            p = min(sum(r['points'] for r in a['reasons']), 25)
            url_pts += p
            flagged.append((a, p))
    url_pts = min(url_pts, 25)  # URL group cap
    if flagged:
        worst = max(flagged, key=lambda x: x[1])[0]
        reason_txt = '; '.join(r['label'] for r in worst['reasons'][:3])
        indicators.append(_mk(
            'suspicious_url', 'Links', 'Suspicious URL detected', url_pts,
            f'`{worst["url"][:90]}` — {reason_txt}. '
            f'{len(flagged)} of {len(analyzed)} extracted link(s) flagged.'))
    for m in parsed.get('masked_links', []):
        indicators.append(_mk(
            'masked_link', 'Links', 'Masked hyperlink', 15,
            f'Visible text shows `{m["displayed"][:60]}` but the link actually '
            f'leads to `{m["actual"][:80]}`.'))
        break
    return analyzed


def detect_language(parsed, indicators) -> dict:
    text = (parsed.get('plain_text', '') + '\n'
            + TAG_RE.sub(' ', parsed.get('html', ''))
            + '\n' + parsed.get('subject', '')).lower()
    hits = {'urgency': [], 'credential': [], 'financial': []}
    for phrase in URGENCY_PHRASES:
        if phrase in text:
            hits['urgency'].append(phrase)
    for phrase in CREDENTIAL_PHRASES:
        if phrase in text:
            hits['credential'].append(phrase)
    for phrase in FINANCIAL_PHRASES:
        if phrase in text:
            hits['financial'].append(phrase)
    if hits['urgency']:
        indicators.append(_mk(
            'urgency', 'Content', 'Urgency / pressure language', 10,
            'Pressure phrases: ' + ', '.join(f'"{p}"' for p in hits['urgency'][:4])))
    if hits['credential']:
        indicators.append(_mk(
            'credential', 'Content', 'Credential / account-verification request', 13,
            'The message asks the recipient about credentials or account '
            'verification: ' + ', '.join(f'"{p}"' for p in hits['credential'][:4])))
    if hits['financial']:
        indicators.append(_mk(
            'financial', 'Content', 'Financial or payment request', 13,
            'Payment-related language: ' + ', '.join(f'"{p}"' for p in hits['financial'][:4])))
    return hits


def detect_attachments(parsed, indicators):
    out = []
    for att in parsed.get('attachments', []):
        fname = (att.get('filename') or '').lower()
        ext = fname.rsplit('.', 1)[-1] if '.' in fname else ''
        risk = 'none'
        if ext in DANGEROUS_EXTS:
            risk = 'dangerous'
        elif ext in RISKY_EXTS:
            risk = 'risky'
        entry = dict(att)
        entry['risk'] = risk
        out.append(entry)
        if risk == 'dangerous':
            indicators.append(_mk(
                'attach_dangerous', 'Attachments', 'Dangerous attachment type', 20,
                f'`{att["filename"]}` (*.{ext}) is an executable/script format '
                f'commonly used to deliver malware.'))
        elif risk == 'risky':
            indicators.append(_mk(
                'attach_risky', 'Attachments', 'Potentially risky attachment', 8,
                f'`{att["filename"]}` (*.{ext}) can carry active content or '
                f'phishing pages. Do not open without verification.'))
    return out


def detect_obfuscation(parsed, indicators):
    findings = []
    grp = 0
    if parsed.get('zero_width_count'):
        p = 8
        grp += p
        findings.append({'type': 'Zero-width characters',
                         'detail': f'{parsed["zero_width_count"]} invisible '
                                   f'Unicode character(s) found in the message content.'})
        indicators.append(_mk('zero_width', 'Obfuscation', 'Zero-width characters detected', p,
                              'Invisible characters can evade keyword filters and alter '
                              'visible text.'))
    homoglyph_hits = []
    texts = [parsed.get('sender_domain', ''), ' '.join(parsed.get('url_domains', []))]
    for t in texts:
        for ch in t:
            if ord(ch) > 127:
                homoglyph_hits.append(ch)
                break
    if homoglyph_hits:
        p = 10
        grp += p
        findings.append({'type': 'Unicode homoglyphs',
                         'detail': 'Non-ASCII characters present in a domain/URL — '
                                   'may visually imitate ASCII letters.'})
        indicators.append(_mk('homoglyph', 'Obfuscation', 'Possible Unicode homoglyph domain', p,
                              'Non-ASCII characters inside a domain can imitate a trusted '
                              'name ("paypaI" style tricks).'))
    if parsed.get('hidden_html'):
        p = 6
        grp += p
        findings.append({'type': 'Hidden HTML content',
                         'detail': 'HTML contains display:none / zero-size / transparent '
                                   'elements.'})
        indicators.append(_mk('hidden_html', 'Obfuscation', 'Hidden content in HTML body', p,
                              'Hidden elements are used to smuggle text past filters or to '
                              'decoy analysis.'))
    raw_all = parsed.get('plain_text', '') + parsed.get('html', '')
    if re.search(r'(?i)hxxp|\[\.\]', raw_all):
        p = 6
        grp += p
        findings.append({'type': 'Defanged / rewritten URLs',
                         'detail': 'URLs written as "hxxp" or "[.]" to bypass link '
                                   'scanners.'})
        indicators.append(_mk('defanged', 'Obfuscation', 'Deliberately defanged URLs', p,
                              'Attackers rewrite URLs (hxxp://, [.]) so automated tools '
                              'do not recognize them.'))
    if grp > 18:  # obfuscation group cap
        overflow = grp - 18
        for ind in reversed([i for i in indicators if i['group'] == 'Obfuscation']):
            if overflow <= 0:
                break
            cut = min(ind['points'], overflow)
            ind['points'] -= cut
            overflow -= cut
    return findings


# ----------------------------------------------------------------------
# Orchestrator
# ----------------------------------------------------------------------
def run_detectors(parsed: dict) -> tuple[list[dict], dict]:
    indicators: list[dict] = []
    detect_identity(parsed, indicators)
    detect_authentication(parsed, indicators)
    url_analysis = detect_urls(parsed, indicators)
    keywords = detect_language(parsed, indicators)
    attachments = detect_attachments(parsed, indicators)
    obfuscation = detect_obfuscation(parsed, indicators)
    meta = {
        'url_analysis': url_analysis,
        'keywords': keywords,
        'attachments': attachments,
        'obfuscation': obfuscation,
    }
    return indicators, meta
