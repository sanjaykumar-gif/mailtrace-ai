// Clean API service layer for MailTrace AI with Demo / Sandbox Fallback.
import { MOCK_ANALYSES, MOCK_CAMPAIGNS, MOCK_STATS } from './mockData.js'

const BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')

function isDemoMode() {
  const val = localStorage.getItem('mailtrace_demo_mode')
  return val === null ? true : val === 'true'
}

async function req(path, { method = 'GET', json, form, timeoutMs = 6000 } = {}) {
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
      return getDemoFallback(path, method)
    }
    if (e.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. The cloud backend server might be waking up from sleep (Render cold start takes ~30s). Please retry in a few moments.',
        408
      )
    }
    throw new ApiError(
      'Cannot reach the MailTrace AI backend. Make sure the backend server is running ' +
      'or that VITE_API_BASE is set to your deployed backend URL in Vercel.',
      0
    )
  } finally {
    clearTimeout(timer)
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    if (isDemoMode()) {
      return getDemoFallback(path, method)
    }
    throw new ApiError(
      'Backend returned HTML instead of JSON. If deployed on Vercel, please ensure VITE_API_BASE is set to your live backend URL (e.g. https://your-backend.onrender.com/api) in Vercel Project Settings > Environment Variables.',
      res.status
    )
  }

  if (!res.ok) {
    if (isDemoMode()) {
      return getDemoFallback(path, method)
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

function getDemoFallback(path, method = 'GET') {
  console.log(`[MailTrace Demo Engine] Serving mock telemetry for: ${method} ${path}`)
  
  if (path === '/health') {
    return { status: 'ok', engine: 'MailTrace AI Demo Sandbox', analyses_stored: MOCK_ANALYSES.length, campaigns_count: MOCK_CAMPAIGNS.length, imap_active: false }
  }
  if (path === '/stats') {
    return MOCK_STATS
  }
  if (path === '/analyses') {
    return { count: MOCK_ANALYSES.length, analyses: MOCK_ANALYSES.map(summarizeLocal) }
  }
  if (path.startsWith('/analyses/')) {
    const aid = path.replace('/analyses/', '')
    const found = MOCK_ANALYSES.find((a) => a.id === aid || a.id.includes(aid)) || MOCK_ANALYSES[0]
    return found
  }
  if (path.startsWith('/analyze/sample/')) {
    const filename = decodeURIComponent(path.replace('/analyze/sample/', ''))
    if (filename.includes('safe') || filename.includes('1_')) return MOCK_ANALYSES[1]
    if (filename.includes('bec') || filename.includes('3_')) return MOCK_ANALYSES[2]
    if (filename.includes('campaign') || filename.includes('5_')) return MOCK_ANALYSES[3]
    return MOCK_ANALYSES[0]
  }
  if (path === '/campaigns') {
    return { count: MOCK_CAMPAIGNS.length, campaigns: MOCK_CAMPAIGNS }
  }
  if (path.startsWith('/campaigns/')) {
    return MOCK_CAMPAIGNS[0]
  }
  if (path === '/samples') {
    return {
      samples: [
        { filename: '1_safe_notice.eml', description: 'Legitimate college placement notice — expect SAFE.' },
        { filename: '2_phishing_credential.eml', description: 'Credential phishing (PayPal look-alike) — expect CRITICAL.' },
        { filename: '3_impersonation_bec.eml', description: 'Executive impersonation / BEC wire-fraud — expect HIGH.' },
        { filename: '4_invoice_fraud.eml', description: 'Fake invoice with risky attachment + shortener — expect HIGH.' },
        { filename: '5_campaign_support.eml', description: 'Campaign email 1 of 3 (shared infrastructure).' },
        { filename: '6_campaign_billing.eml', description: 'Campaign email 2 of 3 (shared infrastructure).' },
        { filename: '7_campaign_account.eml', description: 'Campaign email 3 of 3 (shared infrastructure).' },
      ]
    }
  }
  if (path === '/imap/status') {
    return { is_running: false, is_connected: false, connected_user: null, scanned_count: 0, threat_count: 0 }
  }
  return { success: true }
}

function summarizeLocal(a) {
  return {
    id: a.id,
    timestamp: a.timestamp,
    subject: a.subject,
    sender: a.sender,
    sender_domain: a.sender_domain,
    risk_score: a.risk_score,
    classification: a.classification,
    campaign_id: a.campaign_id,
    source: a.source
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
