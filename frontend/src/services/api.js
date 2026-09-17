// Clean API service layer for MailTrace AI.
// Dev: relative /api is proxied by Vite to FastAPI.
// Prod: set VITE_API_BASE to the backend URL (e.g. https://my-api.example.com/api).

const BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')

async function req(path, { method = 'GET', json, form } = {}) {
  let res
  const opts = { method, headers: {} }
  if (json !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(json)
  } else if (form) {
    opts.body = form
  }
  try {
    res = await fetch(BASE + path, opts)
  } catch (e) {
    throw new ApiError(
      'Cannot reach the MailTrace AI backend. Make sure it is running ' +
      '(uvicorn on port 8000) — rule-based analysis is unavailable offline.',
      0)
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data && data.detail) detail = data.detail
    } catch { /* keep default */ }
    throw new ApiError(detail, res.status)
  }
  return res.json()
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
  analysis: (id) => req(`/analyses/${id}`),
  deleteAnalysis: (id) => req(`/analyses/${id}`, { method: 'DELETE' }),
  analyzeText: (content) => req('/analyze', { method: 'POST', json: { content } }),
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
  reset: () => req('/reset', { method: 'POST' }),

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

export const fmtDate = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  } catch { return iso }
}
