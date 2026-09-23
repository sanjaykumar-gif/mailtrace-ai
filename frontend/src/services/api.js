// Clean API service layer for MailTrace AI with Real-Time Reactive Demo Store & PS 26106 Endpoints
import {
  DEFAULT_RAW_ANALYSES,
  getStoredAnalyses,
  saveStoredAnalyses,
  recordDemoAnalysis,
  getDynamicStats,
  getDynamicCampaigns
} from './mockData.js'

const BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')

export function isDemoMode() {
  const val = localStorage.getItem('mailtrace_demo_mode')
  // Default to false so live backend on :8000 is used by default, but toggleable anytime
  return val === 'true'
}

// Simulated delay helper for smooth UI transitions in demo mode
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function req(path, { method = 'GET', json, form, timeoutMs = 30000, forceDemo = false } = {}) {
  // If Demo Mode is explicitly active, handle ALL endpoints directly
  if (isDemoMode() || forceDemo) {
    if (
      path.startsWith('/analyze/sample/') ||
      (path === '/analyze' && method === 'POST') ||
      (path === '/analyze/upload' && method === 'POST') ||
      (path === '/analyze/text' && method === 'POST')
    ) {
      await sleep(300)
    }
    return getDemoFallback(path, method, json)
  }

  let res
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const opts = { method, headers: {}, signal: controller.signal }

  if (json !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(json)
  } else if (form) {
    opts.body = form
  }

  try {
    res = await fetch(BASE + path, opts)
  } catch (e) {
    clearTimeout(timer)
    if (isDemoMode()) {
      return getDemoFallback(path, method, json)
    }
    if (e.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. The backend server might be waking up (cold start). Please retry in a moment.',
        408
      )
    }
    throw new ApiError(
      'Cannot reach the MailTrace AI backend. Ensure the backend server is running ' +
      'or set VITE_API_BASE in Vercel to your deployed backend URL.',
      0
    )
  } finally {
    clearTimeout(timer)
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    if (isDemoMode()) {
      return getDemoFallback(path, method, json)
    }
    throw new ApiError(
      'Backend returned HTML instead of JSON. If deployed on Vercel, please ensure VITE_API_BASE is set to your live backend URL.',
      res.status
    )
  }

  if (!res.ok) {
    if (isDemoMode()) {
      return getDemoFallback(path, method, json)
    }
    let detail = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data && data.detail) detail = data.detail
    } catch { /* keep default */ }
    throw new ApiError(detail, res.status)
  }
  return res.json()
}

function getDemoFallback(path, method = 'GET', json = null) {
  console.log(`[MailTrace Reactive Demo Store] Fallback for: ${method} ${path}`)
  
  if (path === '/health') {
    const stored = getStoredAnalyses()
    const campaigns = getDynamicCampaigns()
    return {
      status: 'ok',
      engine: 'MailTrace AI Demo Sandbox',
      analyses_stored: stored.length,
      campaigns_count: campaigns.length,
      incidents_count: stored.filter(a => a.risk_score >= 60).length,
      ledger_events_count: stored.length * 8,
      imap_active: false
    }
  }

  if (path === '/stats') {
    return getDynamicStats()
  }

  if (path === '/analyses') {
    const stored = getStoredAnalyses()
    return { count: stored.length, analyses: stored.map(summarizeLocal) }
  }

  if (path.startsWith('/analyses/') && method === 'DELETE') {
    const aid = decodeURIComponent(path.replace('/analyses/', ''))
    const current = getStoredAnalyses()
    const filtered = current.filter(a => a.id !== aid && a.filename !== aid)
    saveStoredAnalyses(filtered)
    return { success: true, message: `Deleted ${aid}` }
  }

  if (path.startsWith('/analyses/')) {
    const aid = decodeURIComponent(path.replace('/analyses/', ''))
    const stored = getStoredAnalyses()
    const found = stored.find((a) => a.id === aid || a.id.includes(aid) || a.filename === aid) ||
                  DEFAULT_RAW_ANALYSES.find((a) => a.id === aid || a.id.includes(aid) || a.filename === aid) ||
                  DEFAULT_RAW_ANALYSES[0]
    return found
  }

  if (path.startsWith('/analyze/sample/')) {
    const filename = decodeURIComponent(path.replace('/analyze/sample/', '')).toLowerCase()
    let match = DEFAULT_RAW_ANALYSES[1]
    if (filename.includes('1_') || filename.includes('safe')) match = DEFAULT_RAW_ANALYSES[0]
    else if (filename.includes('2_') || filename.includes('paypal') || filename.includes('credential')) match = DEFAULT_RAW_ANALYSES[1]
    else if (filename.includes('3_') || filename.includes('bec') || filename.includes('impersonation')) match = DEFAULT_RAW_ANALYSES[2]
    else if (filename.includes('4_') || filename.includes('invoice') || filename.includes('fraud')) match = DEFAULT_RAW_ANALYSES[3]
    else if (filename.includes('5_') || filename.includes('support')) match = DEFAULT_RAW_ANALYSES[4]
    else if (filename.includes('6_') || filename.includes('billing')) match = DEFAULT_RAW_ANALYSES[5]
    else if (filename.includes('7_') || filename.includes('account')) match = DEFAULT_RAW_ANALYSES[6]

    return recordDemoAnalysis(match)
  }

  if (path === '/analyze' || path === '/analyze/text' || path === '/analyze/upload') {
    let match = DEFAULT_RAW_ANALYSES[1]
    if (json?.content && json.content.toLowerCase().includes('safe')) {
      match = DEFAULT_RAW_ANALYSES[0]
    }
    const customRecord = {
      ...match,
      id: 'scan-' + Date.now().toString(36),
      subject: json?.content ? (json.content.split('\n')[0].substring(0, 50) || 'Scanned Email Telemetry') : 'Uploaded Email Telemetry',
      source: 'upload:user_telemetry.eml'
    }
    return recordDemoAnalysis(customRecord)
  }

  if (path === '/campaigns') {
    const dynamicCampaigns = getDynamicCampaigns()
    return { count: dynamicCampaigns.length, campaigns: dynamicCampaigns }
  }

  if (path.startsWith('/campaigns/')) {
    const cid = decodeURIComponent(path.replace('/campaigns/', ''))
    const dynamicCampaigns = getDynamicCampaigns()
    const found = dynamicCampaigns.find((c) => c.id === cid) || dynamicCampaigns[0] || null
    return found
  }

  if (path === '/incidents') {
    const stored = getStoredAnalyses()
    const incs = stored
      .filter(a => a.risk_score >= 60 || a.incident)
      .map((a, idx) => a.incident || ({
        id: `INC-2026-${(idx + 1).toString().padStart(3, '0')}`,
        email_id: a.id,
        tracking_id: a.tracking_id || `EML-2026-${(idx + 1).toString().padStart(3, '0')}`,
        subject: a.subject,
        severity: a.risk_score >= 80 ? 'CRITICAL' : 'HIGH',
        status: 'OPEN',
        campaign_id: a.campaign_id,
        created_at: a.timestamp,
        updated_at: a.timestamp,
        assigned_analyst: 'SOC Lead Analyst',
        trigger_policies: ['Zero-Trust Credential Theft Prevention'],
        evidence_count: a.indicators?.length || 5,
        actions_taken: ['QUARANTINE', 'ADMIN_ALERT'],
        notes: `Auto-triaged threat incident with risk score ${a.risk_score}/100.`
      }))
    return { incidents: incs }
  }

  if (path === '/ledger') {
    const stored = getStoredAnalyses()
    const events = []
    stored.forEach((a, idx) => {
      const tid = a.tracking_id || `EML-2026-${(idx + 1).toString().padStart(3, '0')}`
      events.push(
        { event_id: `EVT-${tid}-01`, timestamp: a.timestamp, event_type: 'EMAIL_INGESTED', email_id: a.id, tracking_id: tid, actor: 'SYSTEM_INGEST', summary: `Ingested ${a.subject}`, sha256_hash: a.sha256 || '8f6561b80a2318e78d9b24281ff296a05c1d2c302fa46259ae6be4612689fa8d' },
        { event_id: `EVT-${tid}-02`, timestamp: a.timestamp, event_type: 'THREAT_ANALYZED', email_id: a.id, tracking_id: tid, actor: 'THREAT_ENGINE', summary: `Score ${a.risk_score}/100`, sha256_hash: a.sha256 || '8f6561b80a2318e78d9b24281ff296a05c1d2c302fa46259ae6be4612689fa8d' },
        { event_id: `EVT-${tid}-08`, timestamp: a.timestamp, event_type: 'EVIDENCE_SEALED', email_id: a.id, tracking_id: tid, actor: 'BLOCKCHAIN_NOTARIZER', summary: 'SHA-256 seal notarized on chain', sha256_hash: a.sha256 || '8f6561b80a2318e78d9b24281ff296a05c1d2c302fa46259ae6be4612689fa8d' }
      )
    })
    return { events }
  }

  if (path === '/geotrace/map') {
    return {
      points: [
        { ip: '185.220.101.47', latitude: 50.1109, longitude: 8.6821, country: 'Germany', city: 'Frankfurt am Main', isp: 'Zwiebelfreunde e.V.', hosting: 'Privacy Transit', risk_score: 100, classification: 'CRITICAL', email_count: 3, vpn_indicator: true, confidence: 88 },
        { ip: '45.155.204.33', latitude: 55.7558, longitude: 37.6173, country: 'Russia', city: 'Moscow', isp: 'Cloud.ru', hosting: 'Cloud Technologies', risk_score: 100, classification: 'CRITICAL', email_count: 1, vpn_indicator: false, confidence: 75 },
        { ip: '103.75.190.12', latitude: 3.1408, longitude: 101.6852, country: 'Malaysia', city: 'Kuala Lumpur', isp: 'VPSMALAYSIA2', hosting: 'Gigabit Hosting', risk_score: 69, classification: 'HIGH', email_count: 1, vpn_indicator: false, confidence: 75 },
        { ip: '91.215.85.14', latitude: 55.7558, longitude: 37.6173, country: 'Russia', city: 'Moscow', isp: 'Prospero OOO', hosting: 'Prospero Infrastructure', risk_score: 93, classification: 'CRITICAL', email_count: 1, vpn_indicator: false, confidence: 75 },
        { ip: '209.85.128.45', latitude: 37.4225, longitude: -122.085, country: 'United States', city: 'Mountain View', isp: 'Google LLC', hosting: 'Google Enterprise', risk_score: 0, classification: 'SAFE', email_count: 1, vpn_indicator: false, confidence: 95 }
      ]
    }
  }

  if (path === '/privacy') {
    return { mask_pii: true, mask_ips: false, retention_days: 30, audit_logging_enabled: true }
  }

  if (path === '/policies') {
    return {
      policies: [
        { id: 'POL-EXEC-IMPERSONATION', name: 'Executive / VIP Impersonation Defense', enabled: true, condition_summary: 'VIP Display Name AND SPF/DMARC Fail', recommended_action: 'QUARANTINE' },
        { id: 'POL-CREDENTIAL-HARVEST', name: 'Zero-Trust Credential Theft Prevention', enabled: true, condition_summary: 'Credential NLP Score >= 50 OR Destination Mismatch', recommended_action: 'QUARANTINE' },
        { id: 'POL-FINANCIAL-WIRE', name: 'BEC & Wire Fraud Safeguard', enabled: true, condition_summary: 'Financial NLP Score >= 50 AND External Origin', recommended_action: 'ADMIN_ALERT' },
        { id: 'POL-MALICIOUS-INFRA', name: 'Anonymized / Tor Relay Ingress Filter', enabled: true, condition_summary: 'IP is Known Tor Exit OR Score >= 80', recommended_action: 'BLOCK_DOMAIN' },
        { id: 'POL-COORDINATED-CAMPAIGN', name: 'Coordinated Attack Campaign Ingress', enabled: true, condition_summary: 'Campaign Member Count >= 2 AND Confidence >= 75%', recommended_action: 'ADMIN_ALERT' },
      ]
    }
  }

  return { success: true }
}

function summarizeLocal(a) {
  return {
    id: a.id,
    tracking_id: a.tracking_id || 'EML-2026-001',
    timestamp: a.timestamp,
    subject: a.subject,
    sender: a.sender,
    sender_domain: a.sender_domain,
    risk_score: a.risk_score,
    classification: a.classification,
    campaign_id: a.campaign_id,
    source: a.source,
    origin_ip: a.origin_ip,
    geotrace: a.geotrace,
    incident_id: a.incident?.id,
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export const api = {
  health: () => req('/health'),
  stats: () => req('/stats'),
  analyses: () => req('/analyses'),
  analysis: (id) => req(`/analyses/${encodeURIComponent(id)}`),
  deleteAnalysis: (id) => req(`/analyses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  analyzeText: (content) => req('/analyze/text', { method: 'POST', json: { content } }),
  analyzeFile: (file) => {
    const form = new FormData()
    form.append('file', file)
    return req('/analyze/upload', { method: 'POST', form })
  },
  analyzeSample: (filename) => req(`/analyze/sample/${encodeURIComponent(filename)}`, { method: 'POST' }),
  samples: () => req('/samples'),
  loadSamples: () => req('/samples/load', { method: 'POST' }),
  campaigns: () => req('/campaigns'),
  campaign: (id) => req(`/campaigns/${encodeURIComponent(id)}`),
  reset: () => req('/analyses', { method: 'DELETE' }),

  // Incidents & Cases
  incidents: () => req('/incidents'),
  incident: (id) => req(`/incidents/${encodeURIComponent(id)}`),
  updateIncident: (id, updates) => req(`/incidents/${encodeURIComponent(id)}`, { method: 'PATCH', json: updates }),

  // Security Policies
  policies: () => req('/policies'),
  savePolicies: (policies) => req('/policies', { method: 'POST', json: policies }),

  // Ledger & Evidence Custody
  ledger: () => req('/ledger'),
  evidence: () => req('/evidence'),
  custody: (id) => req(`/evidence/${encodeURIComponent(id)}/custody`),

  // GeoTrace Threat Origin Map
  geotraceMap: () => req('/geotrace/map'),

  // Privacy & Compliance
  privacy: () => req('/privacy'),
  updatePrivacy: (cfg) => req('/privacy', { method: 'POST', json: cfg }),

  // Official Report Export
  exportReport: (id) => req(`/reports/${encodeURIComponent(id)}/export`),

  // Live Real-Time Ingestion (IMAP)
  imapConnect: (data) => req('/imap/connect', { method: 'POST', json: data }),
  imapStatus: () => req('/imap/status'),
  imapSync: () => req('/imap/sync', { method: 'POST' }),
  imapDisconnect: () => req('/imap/disconnect', { method: 'POST' }),

  // Live DNS & Threat Intel
  dnsLookup: (domain, ip) => req('/dns/lookup', { method: 'POST', json: { domain, ip } }),
}

export const CLASS_COLORS = {
  CRITICAL: '#ff4d5e',
  HIGH: '#ff8a3d',
  MEDIUM: '#f6c945',
  LOW: '#9bd44a',
  SAFE: '#22c55e',
}

export function fmtDate(isoStr) {
  if (!isoStr) return '—'
  try {
    const d = new Date(isoStr)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoStr
  }
}
