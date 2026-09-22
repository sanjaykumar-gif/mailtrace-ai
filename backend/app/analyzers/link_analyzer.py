"""MailTrace AI — Deep Link Security & Destination Mismatch Analyzer.
Inspects embedded HTML and text URLs, checks for Display Text vs Actual Href Mismatch,
URL shorteners, open redirects, homoglyphs, and lookalike domains.
"""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

# Known URL shortener services
SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
    "rebrand.ly", "cutt.ly", "tiny.cc", "s.id", "rb.gy"
}

# Known brand domains often impersonated in phishing
PROTECTED_BRANDS = {
    "paypal": ["paypal.com", "paypal-communication.com"],
    "microsoft": ["microsoft.com", "office.com", "live.com", "outlook.com", "sharepoint.com"],
    "google": ["google.com", "accounts.google.com", "gmail.com", "drive.google.com"],
    "apple": ["apple.com", "icloud.com"],
    "amazon": ["amazon.com", "aws.amazon.com"],
    "chase": ["chase.com"],
    "bankofamerica": ["bankofamerica.com"],
    "wellsfargo": ["wellsfargo.com"],
    "dhl": ["dhl.com", "dhl-express.com"],
    "fedex": ["fedex.com"],
    "netflix": ["netflix.com"],
}


def extract_links_with_anchors(raw_html: str, raw_text: str) -> list[dict[str, str]]:
    """Extracts links from both HTML anchor tags and plain text."""
    links = []
    seen = set()

    # 1. HTML Anchor Extraction: <a href="TARGET">DISPLAY_TEXT</a>
    if raw_html:
        anchor_pattern = re.compile(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', re.IGNORECASE | re.DOTALL)
        for href, inner_html in anchor_pattern.findall(raw_html):
            clean_text = re.sub(r'<[^>]+>', '', inner_html).strip()
            clean_href = href.strip()
            if clean_href and not clean_href.startswith(('mailto:', 'tel:', 'javascript:', '#')):
                key = (clean_text, clean_href)
                if key not in seen:
                    seen.add(key)
                    links.append({"displayed_text": clean_text or clean_href, "target_url": clean_href})

    # 2. Raw URLs from text if no HTML links found or for plain text
    url_pattern = re.compile(r'https?://[^\s<>"\')]+', re.IGNORECASE)
    for u in url_pattern.findall(raw_text):
        u_clean = u.strip().rstrip('.,;:')
        key = (u_clean, u_clean)
        if key not in seen:
            seen.add(key)
            links.append({"displayed_text": u_clean, "target_url": u_clean})

    return links


def analyze_link_security(raw_html: str, raw_text: str) -> dict[str, Any]:
    """Inspects all links and builds a comprehensive link security report."""
    raw_links = extract_links_with_anchors(raw_html, raw_text)
    analyzed_items = []
    suspicious_count = 0
    has_mismatch = False

    for item in raw_links:
        displayed = item["displayed_text"]
        target = item["target_url"]
        
        # Parse URLs
        target_parsed = urlparse(target if target.startswith(('http://', 'https://')) else f"http://{target}")
        target_domain = (target_parsed.hostname or "").lower()

        evidence = []
        is_shortened = target_domain in SHORTENERS
        if is_shortened:
            evidence.append(f"URL Shortener service detected ({target_domain}) obscuring real destination")

        # Destination Mismatch check: does the displayed text look like a URL with a different domain?
        destination_mismatch = False
        disp_domain = None
        if re.search(r'^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', displayed) or displayed.startswith(('http://', 'https://', 'www.')):
            disp_parsed = urlparse(displayed if displayed.startswith(('http://', 'https://')) else f"http://{displayed}")
            disp_domain = (disp_parsed.hostname or "").lower()
            if disp_domain and target_domain and disp_domain != target_domain:
                destination_mismatch = True
                has_mismatch = True
                evidence.append(f"🚨 DESTINATION MISMATCH: Displayed text claims '{disp_domain}', but actual destination points to '{target_domain}'")

        # Homoglyph / Typosquatting check against protected brands
        is_lookalike = False
        for brand, valid_domains in PROTECTED_BRANDS.items():
            if brand in target_domain:
                if not any(target_domain == vd or target_domain.endswith(f".{vd}") for vd in valid_domains):
                    is_lookalike = True
                    evidence.append(f"Look-alike brand domain detected targeting '{brand}' ({target_domain})")

        # Check for IP-literal address in target URL
        if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', target_domain):
            evidence.append(f"Direct IP-literal host used in URL instead of registered domain ({target_domain})")

        # Open redirect heuristics (e.g., ?redirect=, ?url=, ?target=)
        is_redirect = False
        if any(param in (target_parsed.query or "").lower() for param in ["url=", "redirect=", "target=", "dest=", "goto="]):
            is_redirect = True
            evidence.append("Open redirect parameter pattern detected in destination URL")

        # Determine risk level
        if destination_mismatch or is_lookalike:
            risk_level = "CRITICAL" if (destination_mismatch and is_lookalike) else "HIGH"
        elif is_shortened or is_redirect or re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', target_domain):
            risk_level = "MEDIUM"
        elif evidence:
            risk_level = "LOW"
        else:
            risk_level = "SAFE"

        if risk_level in ("MEDIUM", "HIGH", "CRITICAL"):
            suspicious_count += 1

        analyzed_items.append({
            "displayed_text": displayed,
            "target_url": target,
            "domain": target_domain,
            "destination_mismatch": destination_mismatch,
            "is_shortened": is_shortened,
            "is_redirect": is_redirect,
            "is_lookalike": is_lookalike,
            "risk_level": risk_level,
            "evidence": evidence,
        })

    return {
        "total_links": len(analyzed_items),
        "suspicious_links": suspicious_count,
        "has_destination_mismatch": has_mismatch,
        "links": analyzed_items,
    }
