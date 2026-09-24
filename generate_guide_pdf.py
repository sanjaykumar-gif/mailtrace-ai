"""
Generate MailTrace AI — Target Users & Complete Dashboard Guide PDF
Pure Python script without external dependencies.
"""

import os
import sys

def create_pdf(output_path):
    # Professional, well-structured PDF generator
    lines = [
        ("%PDF-1.4", None),
        ("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj", None),
        ("2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >> endobj", None),
        # Page 1
        ("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 6 0 R /Resources << /Font << /F1 9 0 R /F2 10 0 R >> >> >> endobj", None),
        # Page 2
        ("4 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 7 0 R /Resources << /Font << /F1 9 0 R /F2 10 0 R >> >> >> endobj", None),
        # Page 3
        ("5 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 8 0 R /Resources << /Font << /F1 9 0 R /F2 10 0 R >> >> >> endobj", None),
    ]

    # Content for Page 1
    content_p1 = """BT
/F2 20 Tf
50 800 Td
(MailTrace AI - Target Users & Complete Dashboard Guide) Tj
/F1 10 Tf
0 -18 Td
(Enterprise Threat Detection, Origin Geolocation & Forensic Telemetry Platform) Tj
0 -15 Td
(Version 1.0.0 | SIH Production Release) Tj

/F2 14 Tf
0 -30 Td
(PART 1: TARGET USERS & ORGANIZATIONAL PERSONAS) Tj

/F2 11 Tf
0 -22 Td
(1. Tier 1 & Tier 2 SOC Analysts (Security Operations Centers)) Tj
/F1 10 Tf
0 -14 Td
(- Rapidly triages suspicious employee emails without manual header decoding.) Tj
0 -13 Td
(- Deconstructs zero-width obfuscations, masked URLs, and credential lures in seconds.) Tj
0 -13 Td
(- Exports court-admissible forensic PDF evidence reports for ticketing systems.) Tj

/F2 11 Tf
0 -20 Td
(2. Chief Information Security Officers (CISOs) & Security Directors) Tj
/F1 10 Tf
0 -14 Td
(- Monitors enterprise-wide risk exposure across departments and branch networks.) Tj
0 -13 Td
(- Tracks coordinated adversary attack campaigns targeting corporate identities.) Tj
0 -13 Td
(- Evaluates corporate security policy compliance and automated containment metrics.) Tj

/F2 11 Tf
0 -20 Td
(3. Digital Forensics & Cybercrime Investigators (DFIR / Law Enforcement)) Tj
/F1 10 Tf
0 -14 Td
(- Extracts genuine sending nodes, bypassing internal corporate relay proxies.) Tj
0 -13 Td
(- Traces multi-hop chronology and classifies Tor exit nodes / Bulletproof VPS hosting.) Tj
0 -13 Td
(- Validates tamper-proof custody chains backed by SHA-256 and Web3 blockchain seals.) Tj

/F2 11 Tf
0 -20 Td
(4. Corporate Mail & IT Administrators (Exchange / Google Workspace)) Tj
/F1 10 Tf
0 -14 Td
(- Connects live company mailboxes via IMAP Sentinel for automated background ingestion.) Tj
0 -13 Td
(- Inspects live DNS records, MX health, SPF/DKIM keys, and DMARC enforcement.) Tj

/F2 14 Tf
0 -30 Td
(PART 2: UNIFIED DASHBOARDS & MODULE GUIDE (Page 1 of 2)) Tj

/F2 11 Tf
0 -20 Td
(Dashboard 1: Scan Email & Verification Lab (/ or /verify)) Tj
/F1 10 Tf
0 -14 Td
(- Primary manual ingestion gateway supporting .eml, .msg files and raw MIME paste.) Tj
0 -13 Td
(- 5-Stage Animated Parsing HUD: MIME validation -> Crypto Auth -> URL Deobfuscation ->) Tj
0 -13 Td
(  Homoglyph inspection -> Attack DNA correlation.) Tj

/F2 11 Tf
0 -20 Td
(Dashboard 2: Security SOC Dashboard (/dashboard)) Tj
/F1 10 Tf
0 -14 Td
(- Executive telemetry hub featuring 9 real-time metrics, geographical sending nodes map,) Tj
0 -13 Td
(  live threat feed, and 3-pathway ingress onboarding banner when in standby.) Tj
ET"""

    # Content for Page 2
    content_p2 = """BT
/F2 14 Tf
50 800 Td
(PART 2: UNIFIED DASHBOARDS & MODULE GUIDE (Continued)) Tj

/F2 11 Tf
0 -25 Td
(Dashboard 3: Live Mailbox Sentinel (/live)) Tj
/F1 10 Tf
0 -14 Td
(- Continuous zero-trust background mailbox interception for Gmail, Outlook, Yahoo, and IMAP.) Tj
0 -13 Td
(- Background polling every 15s with 1-click Disconnect, on-demand Sync, and DNS Tool.) Tj

/F2 11 Tf
0 -20 Td
(Dashboard 4: Deep Threat Verdict & Explainable Score (/result/:id)) Tj
/F1 10 Tf
0 -14 Td
(- Comprehensive 0-100 risk dial with mathematical penalty breakdowns.) Tj
0 -13 Td
(- Natural Language Social Engineering meters: Urgency, Credential Harvesting, Financial Fraud.) Tj
0 -13 Td
(- Interactive Investigation Tabs: Attack Story Timeline, Infrastructure Graph, Link Security,) Tj
0 -13 Td
(  Origin GeoTrace, Attack DNA, and Printable PDF Forensic Report Export.) Tj

/F2 11 Tf
0 -20 Td
(Dashboard 5: Email Forensics Lab (/forensics)) Tj
/F1 10 Tf
0 -14 Td
(- Multi-Hop Route Timeline showing hop latencies and intermediate mail transfer agents (MTAs).) Tj
0 -13 Td
(- Cryptographic Authentication Matrix (SPF / DKIM / DMARC) and Raw RFC-5322 Viewer.) Tj

/F2 11 Tf
0 -20 Td
(Dashboard 6: Origin GeoTrace & GPS Intelligence (/geotrace)) Tj
/F1 10 Tf
0 -14 Td
(- Pinpoints earliest reliable sender IP with Leaflet & Esri Dark Canvas GPS map.) Tj
0 -13 Td
(- Classifies Autonomous System (ASN), ISP, and flags Proxy / Tor Exit / Hosting Relays.) Tj

/F2 11 Tf
0 -20 Td
(Dashboard 7: Attack DNA & Campaign Clusters (/attack-dna)) Tj
/F1 10 Tf
0 -14 Td
(- Groups isolated phishing emails sharing origin infrastructure into adversary clusters.) Tj
0 -13 Td
(- Dynamic Evolution Wave Tracker analyzing attacker adaptations across multi-wave campaigns.) Tj

/F2 11 Tf
0 -20 Td
(Dashboard 8: Security Policies & Case Incidents (/incidents)) Tj
/F1 10 Tf
0 -14 Td
(- Automated SOC triage case ticketing when emails violate security rules or risk thresholds.) Tj
0 -13 Td
(- Interactive workflow status management: OPEN -> INVESTIGATING -> CONTAINED -> CLOSED.) Tj
ET"""

    # Content for Page 3
    content_p3 = """BT
/F2 14 Tf
50 800 Td
(PART 2: UNIFIED DASHBOARDS & MODULE GUIDE (Final)) Tj

/F2 11 Tf
0 -25 Td
(Dashboard 9: Web3 Blockchain Evidence Ledger (/ledger)) Tj
/F1 10 Tf
0 -14 Td
(- Anchors SHA-256 evidence digests onto the Polygon Amoy EVM Distributed Ledger.) Tj
0 -13 Td
(- Independent Verifier Tool: Input any hash or drop an .eml file to verify on-chain seal.) Tj
0 -13 Td
(- Generates cryptographic notarization certificates for legal non-repudiation.) Tj

/F2 11 Tf
0 -20 Td
(Dashboard 10: Audit History Archive (/history)) Tj
/F1 10 Tf
0 -14 Td
(- Complete searchable database of all scanned emails with instant search, threat pills,) Tj
0 -13 Td
(  and 1-click deletion with automatic campaign re-clustering.) Tj

/F2 11 Tf
0 -20 Td
(Dashboard 11: ARIA AI Security Assistant (Floating Copilot)) Tj
/F1 10 Tf
0 -14 Td
(- Context-aware conversational AI assistant powered by Google Gemini.) Tj
0 -13 Td
(- Navigates pages, explains email authentication tokens, and triages threat vectors.) Tj

/F2 14 Tf
0 -30 Td
(SUMMARY OF ARCHITECTURAL CAPABILITIES) Tj

/F1 10 Tf
0 -18 Td
(Feature                         Implementation Status         Protocol / Technology) Tj
0 -14 Td
(-----------------------------------------------------------------------------------------) Tj
0 -13 Td
(RFC Header Parsing              Production Active             RFC-5322 MIME Parser) Tj
0 -13 Td
(Cryptographic Auth Matrix       Production Active             SPF, DKIM, DMARC Validator) Tj
0 -13 Td
(Origin Geolocation              Production Active             Earliest IP + Leaflet GPS) Tj
0 -13 Td
(Social Engineering NLP          Production Active             Urgency & BEC Heuristic Engine) Tj
0 -13 Td
(Attack DNA Correlation          Production Active             Jaccard Cluster Clustering) Tj
0 -13 Td
(Live Mailbox Ingestion          Production Active             IMAP4 SSL Background Daemon) Tj
0 -13 Td
(Web3 Notarization               Production Active             Polygon Amoy EVM Registry) Tj
0 -13 Td
(Cloud Database Sync             Production Active             Supabase PostgreSQL + RLS) Tj
0 -13 Td
(AI SOC Assistant                Production Active             Google Gemini 1.5 Flash API) Tj

/F2 10 Tf
0 -30 Td
(Generated by MailTrace AI Security Architecture Team | All Rights Reserved) Tj
ET"""

    def make_stream_obj(num, text):
        encoded = text.encode("latin-1")
        return f"{num} 0 obj << /Length {len(encoded)} >> stream\n{text}\nendstream\nendobj"

    # Font objects
    font1 = "9 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"
    font2 = "10 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj"

    obj_strings = [
        "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
        "2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >> endobj",
        "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 6 0 R /Resources << /Font << /F1 9 0 R /F2 10 0 R >> >> >> endobj",
        "4 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 7 0 R /Resources << /Font << /F1 9 0 R /F2 10 0 R >> >> >> endobj",
        "5 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 8 0 R /Resources << /Font << /F1 9 0 R /F2 10 0 R >> >> >> endobj",
        make_stream_obj(6, content_p1),
        make_stream_obj(7, content_p2),
        make_stream_obj(8, content_p3),
        font1,
        font2
    ]

    # Compute xref offsets
    output = "%PDF-1.4\n"
    offsets = []
    
    for obj_str in obj_strings:
        offsets.append(len(output.encode("latin-1")))
        output += obj_str + "\n"

    xref_pos = len(output.encode("latin-1"))
    output += f"xref\n0 {len(obj_strings) + 1}\n0000000000 65535 f \n"
    for offset in offsets:
        output += f"{offset:010d} 00000 n \n"

    output += f"trailer << /Size {len(obj_strings) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n"

    with open(output_path, "wb") as f:
        f.write(output.encode("latin-1"))
    print(f"Successfully created PDF at: {output_path}")

if __name__ == "__main__":
    target = os.path.join(os.path.dirname(os.path.abspath(__file__)), "MailTrace_AI_Target_Users_and_Complete_Dashboard_Guide.pdf")
    create_pdf(target)
