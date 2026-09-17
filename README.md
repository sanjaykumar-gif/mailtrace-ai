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

## 2. Solution

MailTrace AI combines:

| Capability | Description |
|---|---|
| Threat detection | Rule-based engine over sender identity, auth results, content, links, attachments, infrastructure |
| Email forensics | Header parsing, SPF/DKIM/DMARC results, Received-chain route timeline, origin-IP estimation |
| Explainable scoring | 0–100 score with a full evidence breakdown (every point justified) |
| Explainable AI | Human-readable reasons generated strictly from detected indicators — the AI never invents evidence |
| **Attack DNA (USP)** | Cross-email correlation on shared IP / domain / URL / reply-to / sender pattern / language → **POSSIBLE ATTACK CAMPAIGN** with confidence score |
| Attack graph | Visual relationship graph of emails ↔ domains ↔ URLs ↔ IPs |

### The USP: Attack Campaign Correlation

Most tools stop at "this email is phishing". MailTrace AI answers:
*"these three emails arrived from the same server, share a fake domain and a
URL destination, use the same role-based sender naming and the same lure
language — this is a coordinated campaign (confidence 88%)"*.

> Correlation indicates shared infrastructure or patterns between emails; it
> does **not** independently prove common authorship. Campaign results are
> investigative leads, not attribution.

## 3. Features

- Dashboard with totals (analyzed / critical / high / campaigns), threat
  distribution donut chart and recent analyses
- Analyze via **.eml upload** or **raw paste** (handles incomplete headers
  gracefully)
- Threat score bands: 0–20 SAFE · 21–40 LOW · 41–60 MEDIUM · 61–80 HIGH · 81–100 CRITICAL
- Explanation report: numbered reasons, evidence, conclusion, recommended action
- Forensics: sender overlay, authentication grid, network indicators, URL
  indicators (non-clickable, never visited), attachments, obfuscation
  findings, route timeline, raw-header viewer
- Obfuscation detection: zero-width characters, Unicode homoglyphs, hidden
  HTML, defanged URLs (`hxxp`, `[.]`), masked hyperlinks
- 7 built-in demo emails, including a coherent 3-email campaign
- Safe by design: untrusted input is never rendered as HTML, links are inert,
  attachments are never executed, uploads are size- and type-limited, sample
  paths are validated against traversal

## 4. Architecture

```
mailtrace-ai/
├── backend/                     FastAPI (Python)
│   ├── app/
│   │   ├── main.py              app entry + CORS
│   │   ├── api/routes.py        REST endpoints
│   │   ├── analyzers/
│   │   │   ├── email_parser.py  RFC parsing, URLs/IPs, Received chain, auth
│   │   │   ├── threat_engine.py rule-based detectors (evidence-producing)
│   │   │   ├── scoring.py       score bands & classification
│   │   │   ├── explainer.py     deterministic explainability (+ optional LLM rephrase)
│   │   │   ├── correlation.py   Attack DNA: pairwise scoring, union-find campaigns
│   │   │   └── pipeline.py      orchestration + record building
│   │   └── storage/store.py     local JSON store (no DB needed for MVP)
│   └── requirements.txt
├── frontend/                    React 18 + Vite
│   └── src/
│       ├── pages/               Dashboard · Analyze · Result · Forensics · AttackDNA · History
│       ├── components/          Sidebar · ScoreGauge · ThreatChart · AuthPanel ·
│       │                        UrlTable · RouteTimeline · CampaignGraph
│       └── services/api.js      API service layer (loading/success/error states)
├── sample_emails/               7 demo .eml files (safe, phishing, BEC, fraud, 3-email campaign)
└── README.md
```

**Tech stack:** React 18, Vite, Recharts, custom SVG graph · Python 3.13,
FastAPI, standard-library email/parser · storage: local JSON (MVP).

## 5. Installation & Running

Prerequisites: **Python 3.10+** and **Node 18+**.

### Backend (port 8000)

```bash
cd mailtrace-ai/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

API docs (Swagger): http://localhost:8000/docs

### Frontend (port 5173)

```bash
cd mailtrace-ai/frontend
npm install
npm run dev
```

Open http://localhost:5173 — the dev server proxies `/api` to the backend on
port 8000 automatically.

### Production / deployment

- Frontend: `npm run build` → deploy `dist/` to Vercel/Netlify. Set
  `VITE_API_BASE=https://<your-backend-host>/api` as a build-time env var.
- Backend: deploy the FastAPI app (e.g. Render/Railway/Fly) with
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

### Environment variables (all optional)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE` | Frontend: backend base URL for production builds |
| `MAILTRACE_LLM_ENDPOINT` / `MAILTRACE_LLM_KEY` | Optional external LLM used only to *rephrase* the deterministic explanation. The LLM receives only structured evidence; analysis never depends on it. Without it, a fully deterministic explanation generator is used. |

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
