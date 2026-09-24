"""
Attack DNA — cross-email campaign correlation engine.

Correlates analyzed emails on shared forensic indicators:
  Same IP / same subnet, same sender domain, shared URL infrastructure,
  similar sender naming pattern, similar language, same Reply-To domain.

Correlation NEVER claims common authorship — only shared infrastructure
or patterns ("POSSIBLE ATTACK CAMPAIGN").
"""

from __future__ import annotations

import ipaddress
from datetime import datetime, timezone

from .threat_engine import COMMON_LOCAL_PARTS

DISCLAIMER = ('Correlation indicates shared infrastructure or patterns between '
              'emails; it does not independently prove common authorship. Treat '
              'campaign results as leads for investigation, not attribution.')

LINK_THRESHOLD = 30


def _same_subnet(ip1: str, ip2: str) -> bool:
    try:
        a = ipaddress.ip_address(ip1)
        b = ipaddress.ip_address(ip2)
        if a.version == 4 and b.version == 4:
            return a.packed[:3] == b.packed[:3]  # /24
    except ValueError:
        pass
    return False


def _similar_sender_pattern(a: dict, b: dict) -> tuple[bool, str]:
    """Same sender domain with different, role-style local parts."""
    if not a.get('sender_domain') or a.get('sender_domain') != b.get('sender_domain'):
        return False, ''
    la, lb = a.get('local_part', ''), b.get('local_part', '')
    if not la or not lb or la == lb:
        return False, ''
    if la in COMMON_LOCAL_PARTS or lb in COMMON_LOCAL_PARTS:
        return True, f'{la}@ / {lb}@ — role-based sender names on one domain'
    if la[:3] == lb[:3]:
        return True, f'{la}@ / {lb}@ — similar local-part prefix'
    return False, ''


def _similar_language(a: dict, b: dict) -> tuple[bool, list]:
    ka = set(a.get('keywords_flat', []))
    kb = set(b.get('keywords_flat', []))
    inter = sorted(ka & kb)
    if len(inter) >= 1:
        return True, inter[:4]
    return False, []


def pair_score(a: dict, b: dict) -> tuple[int, list[dict]]:
    score = 0
    shared: list[dict] = []

    ips_a = set(a.get('public_ips') or a.get('ips') or [])
    ips_b = set(b.get('public_ips') or b.get('ips') or [])
    common_ips = sorted(ips_a & ips_b)
    if common_ips:
        score += 30
        shared.append({'type': 'ip', 'label': 'Shared origin/mail IP',
                       'points': 30, 'values': common_ips})
    else:
        subnet = sorted({f'{x} ↔ {y}' for x in ips_a for y in ips_b
                         if _same_subnet(x, y)})
        if subnet:
            score += 12
            shared.append({'type': 'subnet', 'label': 'Same IP subnet (/24) — shared IP infrastructure',
                           'points': 12, 'values': subnet})

    dom_a = a.get('sender_domain', '')
    dom_b = b.get('sender_domain', '')
    if dom_a and dom_a == dom_b:
        score += 25
        shared.append({'type': 'domain', 'label': 'Same sender domain',
                       'points': 25, 'values': [dom_a]})

    urls_a = set(a.get('url_domains', []))
    urls_b = set(b.get('url_domains', []))
    common_url = sorted(urls_a & urls_b)
    if common_url:
        score += 20
        shared.append({'type': 'url', 'label': 'Shared URL infrastructure',
                       'points': 20, 'values': common_url})

    sim, detail = _similar_sender_pattern(a, b)
    if sim:
        score += 10
        shared.append({'type': 'pattern', 'label': 'Similar sender naming pattern',
                       'points': 10, 'values': [detail]})

    sim_lang, phrases = _similar_language(a, b)
    if sim_lang:
        score += 10
        shared.append({'type': 'language', 'label': 'Similar suspicious language',
                       'points': 10, 'values': phrases})

    rt_a = a.get('reply_to_domain', '')
    rt_b = b.get('reply_to_domain', '')
    if rt_a and rt_a == rt_b:
        score += 5
        shared.append({'type': 'reply_to', 'label': 'Same Reply-To domain',
                       'points': 5, 'values': [rt_a]})

    return min(score, 100), shared


def recompute_campaigns(store) -> list[dict]:
    """Rebuild campaign groups from all stored analyses (union-find)."""
    analyses = store.load_analyses()
    n = len(analyses)
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[rx] = ry

    pair_map: dict[tuple[int, int], tuple[int, list]] = {}
    for i in range(n):
        for j in range(i + 1, n):
            s, shared = pair_score(analyses[i], analyses[j])
            pair_map[(i, j)] = (s, shared)
            if s >= LINK_THRESHOLD:
                union(i, j)

    groups: dict[int, list[int]] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)

    # reset campaign fields on all analyses
    for a in analyses:
        a['campaign_id'] = None
        a['related_ids'] = []

    campaigns: list[dict] = []
    real_groups = [g for g in groups.values() if len(g) >= 2]
    real_groups.sort(key=lambda g: min(analyses[i].get('timestamp') or '' for i in g))

    for num, members in enumerate(real_groups, 1):
        cid = f'CAMP-{num:03d}'
        pair_scores = []
        aggregate: list[dict] = []
        for ii, i in enumerate(members):
            for j in members[ii + 1:]:
                if (i, j) in pair_map:
                    s, shared = pair_map[(i, j)]
                else:
                    s, shared = pair_map[(j, i)]
                pair_scores.append(s)
                for item in shared:
                    aggregate.append(item)
                if s >= LINK_THRESHOLD:
                    analyses[i]['related_ids'] = sorted(
                        set(analyses[i]['related_ids']) | {analyses[j]['id']})
                    analyses[j]['related_ids'] = sorted(
                        set(analyses[j]['related_ids']) | {analyses[i]['id']})
        for i in members:
            analyses[i]['campaign_id'] = cid

        # aggregate shared indicators, deduplicated by (type, value)
        summary: dict[str, dict] = {}
        for item in aggregate:
            key = item['type']
            entry = summary.setdefault(key, {
                'type': item['type'], 'label': item['label'],
                'points': item['points'], 'values': []})
            for v in item['values']:
                if v not in entry['values']:
                    entry['values'].append(v)

        confidence = round(sum(pair_scores) / len(pair_scores)) if pair_scores else 0
        campaigns.append({
            'id': cid,
            'title': 'POSSIBLE ATTACK CAMPAIGN',
            'confidence': confidence,
            'member_ids': [analyses[i]['id'] for i in members],
            'member_count': len(members),
            'shared_indicators': list(summary.values()),
            'disclaimer': DISCLAIMER,
            'created_at': datetime.now(timezone.utc).isoformat(),
        })

    store.save_analyses(analyses)
    store.save_campaigns(campaigns)
    campaigns.sort(key=lambda c: (-c['member_count'], -c['confidence']))
    return campaigns
