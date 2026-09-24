# MailTrace AI

### Explainable Email Threat Investigation & Attack Campaign Correlation Platform

**Smart India Hackathon 2026 · Problem Statement SIH26106**

> **From Suspicious Email to Attack Campaign.**

MailTrace AI is an explainable email investigation platform that analyzes
suspicious emails, extracts forensic evidence, and **correlates related
messages to reveal possible attack campaigns** — instead of treating every
suspicious email as an isolated event.

---

## 1. Problem Overview

Email is the primary vector for phishing, impersonation, business email
compromise (BEC), financial fraud, credential theft and malware delivery.

Traditional email-security tools often *detect* threats but fail to explain:

- **Why** an email was flagged,
- **Which forensic indicators** caused the detection,
- **Where** the email actually came from, and
- **Whether multiple suspicious emails belong to the same campaign.**
## 2. Solution & Platform Modules

MailTrace AI is an enterprise-grade cyber defense and email forensics platform offering 12 integrated security modules:

| Capability | Module | Description |
|---|---|---|
| **Deep Forensic Scanner** | `/scan` | RFC822 parser, header validation, DKIM/SPF/DMARC auth matrix, zero-width steganography decoding |
| **Executive SOC Dashboard** | `/dashboard` | Dynamic threat radar, real-time risk gauges, live attack cluster summary |
| **Interactive 3D GeoTrace** | `/geotrace` | Hop-by-hop visual mail routing, ISP metadata, origin IP estimation on dark interactive globe |
| **Attack DNA & Phylogeny** | `/dna` | Cross-email campaign clustering, shared infrastructure correlation, union-find threat tree |
| **Incident Response Center** | `/incidents` | SOC ticket management, automated mitigation playbooks, quarantine execution |
| **Chain of Custody Forensics**| `/forensics` | Cryptographic SHA-256 digital evidence sealing and printable compliance certificates |
| **Blockchain Audit Ledger** | `/ledger` | Immutable notarization records anchored to the Polygon Amoy blockchain |
| **Google Gemini Security Copilot** | Global | Conversational AI assistant for real-time natural language threat triage |
| **Live Mailbox Sentinel** | `/live` | 24/7 background IMAP email interception and threat event streaming |
| **Google OAuth 2.0 & RBAC** | `/auth` | Secure identity management with Google Sign-In and role-based permissions |

---

## 3. Architecture & Cloud Integrations

```
mailtrace-ai/
├── backend/                     FastAPI Python Engine
│   ├── app/
│   │   ├── main.py              FastAPI server + CORS + lifespan
│   │   ├── api/routes.py        REST endpoints & live telemetry
│   │   ├── analyzers/           Forensics, header parser, threat engine, correlation
│   │   ├── core/config.py       Typed Pydantic settings & env management
│   │   └── storage/             Hybrid atomic store + Supabase PostgreSQL sync
│   ├── supabase_schema.sql      Idempotent PostgreSQL schema + RLS + Realtime
│   ├── Dockerfile               Production multi-stage container
│   ├── Procfile                 Cloud deployment process manager
│   └── requirements.txt
├── frontend/                    React 18 + Vite + Tailwind/Modern Glassmorphism
│   ├── src/
│   │   ├── pages/               12 responsive security dashboards
│   │   ├── components/          Threat charts, GeoTrace map, DNA phylogeny, Gemini Copilot
│   │   └── services/            API, Supabase Realtime, Blockchain & OAuth
│   └── vercel.json              Vercel SPA routing rewrite config
└── README.md
```

**Third-Party Integrations:**
- **Database:** Supabase PostgreSQL Cloud DB + Realtime WebSockets
- **Threat Intelligence:** VirusTotal API (Reputation) & AbuseIPDB API (Confidence Scoring)
- **AI Intelligence:** Google Gemini AI Copilot
- **Blockchain:** Polygon Amoy EVM Testnet RPC
- **Authentication:** Google OAuth 2.0 via Supabase Auth

---

## 4. Quick Start Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**

### 1. Run Backend Server
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
*API Docs (Swagger UI): `http://127.0.0.1:8000/docs`*

### 2. Run Frontend Web App
```bash
cd frontend
npm install
npm run dev
```
*Web Application: `http://localhost:5173/`*

---

## 5. Cloud Deployment (100% Free Tier)

- **Frontend:** Deploy to **Vercel** (`frontend/` root) with `VITE_API_URL` pointing to your backend.
- **Backend:** Deploy to **Koyeb / Render / Railway** (`backend/Dockerfile`) with environment variables.
- **Database:** Deploy schema to **Supabase** via `backend/supabase_schema.sql`.

## 6. Demo flow (SIH judging)

1. Open **Dashboard** — the SOC overview is live.
2. Go to **Analyze Email** → upload `sample_emails/2_phishing_credential.eml`
   (or use the sample buttons) → **ANALYZE EMAIL**.
3. See **100/100 CRITICAL** with the full evidence list: reply-to mismatch,
   look-alike domain, SPF/DMARC failure, suspicious URL, masked link,
   credential request, zero-width character…
4. Open **Forensics** — sender overlay, auth grid, origin IP, route timeline,
   URL indicators, obfuscation, raw headers.
5. Analyze the three `5/6/7_campaign_*.eml` emails.
6. Open **Attack DNA** → **⚠ POSSIBLE ATTACK CAMPAIGN — CAMP-001,
   confidence 88%**: shared origin IP `185.220.101.47`, shared domain
   `paypa1-security.example`, shared URL infrastructure, role-based sender
   pattern (`support@ / billing@ / account@`), same lure language — rendered
   in the attack infrastructure graph.

The **Load Demo Samples** button on the dashboard performs steps 2–5 at once.

## 7. API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Engine status |
| POST | `/api/analyze` | Analyze pasted raw email `{content}` |
| POST | `/api/analyze/upload` | Analyze an uploaded `.eml` file (multipart) |
| POST | `/api/analyze/sample/{filename}` | Analyze a built-in sample |
| POST | `/api/samples/load` | Analyze all 7 samples |
| GET | `/api/samples` / `/api/samples/content/{name}` | List / read samples |
| GET | `/api/analyses` | All stored analyses (summaries) |
| GET | `/api/analyses/{id}` | Full analysis incl. related activity |
| DELETE | `/api/analyses/{id}` | Delete (campaigns recalculated) |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/campaigns` | All correlated campaigns |
| GET | `/api/campaigns/{id}` | Campaign detail with members & graph data |
| POST | `/api/reset` | Clear all local data |

Every analysis stores: id, timestamp, sender, recipient, subject, risk score,
classification, sender/reply-to domains, IPs, URLs, SPF/DKIM/DMARC, matched
indicators and keywords, route, and campaign id when correlated.

## 8. Scoring model (evidence-based, deterministic)

| Signal | Points |
|---|---|
| Reply-To mismatch | +18 |
| Return-Path mismatch | +10 |
| Same-IP campaign link… (correlation, below) | — |
| Sender domain resembles brand | +12 |
| Display-name impersonation | +12 |
| Reply-To on high-abuse TLD | +8 |
| Authentication failures (SPF/DKIM/DMARC) | up to +20 |
| Suspicious URLs (group) | up to +25 |
| Masked hyperlink | +15 |
| Credential request | +13 |
| Financial request | +13 |
| Urgency language | +10 |
| Dangerous / risky attachment | +20 / +8 |
| Obfuscation (group) | up to +18 |

**Campaign confidence** = mean pairwise correlation: same IP +30 · same /24
subnet +12 · same sender domain +25 · shared URL infrastructure +20 · similar
sender pattern +10 · similar language +10 · same Reply-To domain +5 (link
threshold ≥ 30).

## 9. Safety & honesty guarantees

- Never visits suspicious links, never executes attachments or HTML scripts.
- Treats every upload as untrusted input; HTML is escaped/stripped before display.
- **No fake security results**: unknown SPF/DKIM/DMARC is shown as `UNKNOWN`;
  missing origin is reported as *"could not be conclusively determined"*; no
  external reputation/threat-intel/DNS data is fabricated.
- File type + 2 MB size limits; sample endpoint is whitelist-validated
  (no path traversal).

## 10. Future scope

- Live DNS verification (real SPF/DKIM/DMARC lookups) and domain age
- Optional threat-intel feeds (URL/domain/IP reputation) with clear provenance
- Mailbox API ingestion (IMAP/Microsoft Graph/Gmail) and webhook alerts
- ML-assisted phishing classifier fused with the rule engine
- Multi-tenant persistence (PostgreSQL), team workflows and case export (PDF/STIX)
- Geo-ASN attribution hints (clearly marked as indicative)

---

> **Disclaimer:** MailTrace AI does not claim absolute certainty. It provides
> explainable risk assessment and correlation based on available email evidence.
