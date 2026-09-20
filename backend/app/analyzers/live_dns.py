"""
MailTrace AI — Live DNS & Threat Intelligence Resolver.

Performs real-time DNS queries for SPF, DMARC, and MX records,
and queries IP Geolocation / ASN intelligence for sending servers.
Designed to be fast, non-blocking with tight timeouts, thread-safe LRU caching,
and resilient error fallbacks.
"""

from __future__ import annotations

import json
import logging
import urllib.request
import urllib.error
from functools import lru_cache
import dns.resolver

from ..core.logging import logger

DNS_TIMEOUT = 2.5  # seconds


def _get_resolver() -> dns.resolver.Resolver:
    res = dns.resolver.Resolver()
    res.lifetime = DNS_TIMEOUT
    res.timeout = DNS_TIMEOUT
    return res


@lru_cache(maxsize=1024)
def get_live_dns_intel(domain: str) -> dict:
    """
    Perform live DNS checks on the domain with LRU caching:
    - MX records check (is the domain able to receive emails?)
    - SPF TXT record (v=spf1...)
    - DMARC TXT record (_dmarc.<domain>)
    """
    if not domain or '.' not in domain:
        return {
            'domain': domain or '',
            'has_mx': False,
            'mx_records': [],
            'spf_record': None,
            'dmarc_record': None,
            'dmarc_policy': 'NONE',
            'status': 'invalid_domain'
        }

    domain = domain.strip().lower()
    intel = {
        'domain': domain,
        'has_mx': False,
        'mx_records': [],
        'spf_record': None,
        'dmarc_record': None,
        'dmarc_policy': 'NONE',
        'status': 'resolved'
    }

    resolver = _get_resolver()

    # 1. MX check
    try:
        mx_answers = resolver.resolve(domain, 'MX')
        intel['mx_records'] = [str(r.exchange).rstrip('.') for r in mx_answers]
        intel['has_mx'] = len(intel['mx_records']) > 0
    except Exception:
        intel['has_mx'] = False

    # 2. SPF check
    try:
        txt_answers = resolver.resolve(domain, 'TXT')
        for rdata in txt_answers:
            txt_str = ''.join(b.decode('utf-8', errors='ignore') if isinstance(b, bytes) else str(b) for b in rdata.strings)
            if 'v=spf1' in txt_str.lower():
                intel['spf_record'] = txt_str
                break
    except Exception:
        intel['spf_record'] = None

    # 3. DMARC check
    dmarc_domain = f'_dmarc.{domain}'
    try:
        dmarc_answers = resolver.resolve(dmarc_domain, 'TXT')
        for rdata in dmarc_answers:
            txt_str = ''.join(b.decode('utf-8', errors='ignore') if isinstance(b, bytes) else str(b) for b in rdata.strings)
            if 'v=dmarc1' in txt_str.lower():
                intel['dmarc_record'] = txt_str
                # extract policy (p=reject / p=quarantine / p=none)
                if 'p=reject' in txt_str.lower():
                    intel['dmarc_policy'] = 'REJECT'
                elif 'p=quarantine' in txt_str.lower():
                    intel['dmarc_policy'] = 'QUARANTINE'
                elif 'p=none' in txt_str.lower():
                    intel['dmarc_policy'] = 'MONITOR_ONLY'
                break
    except Exception:
        intel['dmarc_record'] = None

    return intel


@lru_cache(maxsize=1024)
def get_live_ip_intel(ip: str) -> dict:
    """
    Fetches real-time Geolocation, Country, ISP, and ASN for a public IP address.
    Cached in memory to eliminate redundant external queries.
    """
    if not ip or ip.startswith(('10.', '192.168.', '172.16.', '127.', 'fc00:', 'fe80:')):
        return {'ip': ip or '127.0.0.1', 'is_private': True, 'country': 'Local / Private Network'}

    ip = ip.strip()
    try:
        url = f'http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query'
        req = urllib.request.Request(url, headers={'User-Agent': 'MailTrace-AI-ThreatEngine/1.0'})
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                if data.get('status') == 'success':
                    return {
                        'ip': ip,
                        'is_private': False,
                        'country': data.get('country', 'Unknown'),
                        'country_code': data.get('countryCode', ''),
                        'city': data.get('city', ''),
                        'region': data.get('regionName', ''),
                        'isp': data.get('isp', ''),
                        'org': data.get('org', ''),
                        'as': data.get('as', ''),
                        'lat': data.get('lat'),
                        'lon': data.get('lon'),
                        'status': 'resolved'
                    }
    except Exception as exc:
        logger.debug(f"[LiveDNS] GeoIP lookup failed for {ip}: {exc}")

    return {'ip': ip, 'is_private': False, 'country': 'Public Network (Unresolved)', 'status': 'lookup_timeout'}
