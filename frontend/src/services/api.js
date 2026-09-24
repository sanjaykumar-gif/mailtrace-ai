// Enterprise API Client for MailTrace AI Production Prototype
// PS 26106 Live Threat Detection, Forensics, Attack DNA, and Ingestion

const BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function req(path, { method = 'GET', json, form, timeoutMs = 25000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const opts = { method, headers: {}, signal: controller.signal }

  if (json !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(json)
  } else if (form) {
    opts.body = form
  }

  let res
  try {
    res = await fetch(BASE + path, opts)
  } catch (e) {
    clearTimeout(timer)
    if (e.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. The backend analysis engine is taking longer than expected. Please retry.',
        408
      )
    }
    throw new ApiError(
      'Cannot connect to the MailTrace AI backend server (FastAPI on port 8000). Please ensure the backend is running.',
      0
    )
  } finally {
    clearTimeout(timer)
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      `Backend returned unexpected format (${res.status}). Ensure API proxy is configured.`,
      res.status
    )
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data && data.detail) {
        detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
      }
    } catch {
      // Use fallback
    }
    throw new ApiError(detail, res.status)
  }

  return res.json()
}

export const api = {
  // System Telemetry & Health
  health: () => req('/health'),
  stats: () => req('/stats'),

  // Analyses
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
  reset: () => req('/analyses', { method: 'DELETE' }),

  // Attack Campaigns & Correlation DNA
  campaigns: () => req('/campaigns'),
  campaign: (id) => req(`/campaigns/${encodeURIComponent(id)}`),

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

  // Official Forensic Report Export
  exportReport: (id) => req(`/reports/${encodeURIComponent(id)}/export`),

  // Live Real-Time Mailbox Ingestion (IMAP)
  imapConnect: (data) => req('/imap/connect', { method: 'POST', json: data, timeoutMs: 60000 }),
  imapStatus: () => req('/imap/status'),
  imapSync: () => req('/imap/sync', { method: 'POST', timeoutMs: 60000 }),
  imapDisconnect: () => req('/imap/disconnect', { method: 'POST' }),

  // Live DNS & Threat Intelligence Lookups
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
