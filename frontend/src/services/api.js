// Clean API service layer for MailTrace AI with Real-Time Reactive Demo Store
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
  return val === null ? true : val === 'true'
}

// Simulated delay helper for smooth UI transitions in demo mode
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function req(path, { method = 'GET', json, form, timeoutMs = 5000, forceDemo = false } = {}) {
  // If Demo Mode is explicitly active, handle operations via local reactive store
  if (isDemoMode() || forceDemo) {
    if (
      path.startsWith('/analyze/sample/') ||
      path === '/samples' ||
      path === '/samples/load' ||
      path === '/reset' ||
      (path.startsWith('/analyses/') && method === 'DELETE') ||
      (path === '/analyze' && method === 'POST') ||
      (path === '/analyze/upload' && method === 'POST')
    ) {
      await sleep(350) // Brief delay for realistic UI transition
      return getDemoFallback(path, method, json)
    }
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
      'Backend returned HTML instead of JSON. If deployed on Vercel, please ensure VITE_API_BASE is set to your live backend URL in Vercel Project Settings > Environment Variables.',
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
  console.log(`[MailTrace Reactive Demo Store] Dispatching: ${method} ${path}`)
  
  if (path === '/health') {
    const stored = getStoredAnalyses()
    const campaigns = getDynamicCampaigns()
    return {
      status: 'ok',
      engine: 'MailTrace AI Demo Sandbox',
      analyses_stored: stored.length,
      campaigns_count: campaigns.length,
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
    let match = DEFAULT_RAW_ANALYSES[1] // default PayPal critical
    if (filename.includes('1_') || filename.includes('safe')) match = DEFAULT_RAW_ANALYSES[0]
    else if (filename.includes('2_') || filename.includes('paypal') || filename.includes('credential')) match = DEFAULT_RAW_ANALYSES[1]
    else if (filename.includes('3_') || filename.includes('bec') || filename.includes('impersonation')) match = DEFAULT_RAW_ANALYSES[2]
    else if (filename.includes('4_') || filename.includes('invoice') || filename.includes('fraud')) match = DEFAULT_RAW_ANALYSES[3]
    else if (filename.includes('5_') || filename.includes('support')) match = DEFAULT_RAW_ANALYSES[4]
    else if (filename.includes('6_') || filename.includes('billing')) match = DEFAULT_RAW_ANALYSES[5]
    else if (filename.includes('7_') || filename.includes('account')) match = DEFAULT_RAW_ANALYSES[6]

    // Record into persistent demo store so it immediately reflects across Dashboard, Forensics, History, and Attack DNA
    return recordDemoAnalysis(match)
  }

  if (path === '/analyze' || path === '/analyze/upload') {
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

  if (path === '/samples') {
    return {
      samples: [
        { filename: '1_safe_notice.eml', description: 'Legitimate college placement notice with valid SPF/DKIM.' },
        { filename: '2_phishing_credential.eml', description: 'Look-alike domain, zero-width chars, and masked link.' },
        { filename: '3_impersonation_bec.eml', description: 'Executive spoofing and urgency wire-transfer request.' },
        { filename: '4_invoice_fraud.eml', description: 'Deceptive invoice with URL shorteners and risky payload.' },
        { filename: '5_campaign_support.eml', description: 'Coordinated attack campaign 1 of 3 (shared infra).' },
        { filename: '6_campaign_billing.eml', description: 'Coordinated attack campaign 2 of 3 (shared infra).' },
        { filename: '7_campaign_account.eml', description: 'Coordinated attack campaign 3 of 3 (shared infra).' },
      ]
    }
  }

  if (path === '/samples/load') {
    // Load all 7 default samples into the store
    saveStoredAnalyses(DEFAULT_RAW_ANALYSES)
    return { loaded: DEFAULT_RAW_ANALYSES.length, count: DEFAULT_RAW_ANALYSES.length, message: 'Loaded all 7 demo samples into workspace' }
  }

  if (path === '/reset') {
    saveStoredAnalyses([])
    return { success: true, message: 'Cleared demo telemetry store' }
  }

  if (path === '/imap/status') {
    return { is_running: false, is_connected: false, connected_user: null, scanned_count: 0, threat_count: 0 }
  }

  if (path === '/dns/lookup') {
    return {
      domain: json?.domain || 'target-domain.example',
      ip: json?.ip || '185.220.101.42',
      live_dns: { has_mx: true, mx_records: ['mail.target-domain.example'], spf_record: 'v=spf1 ~all', dmarc_record: 'v=DMARC1; p=reject', dmarc_policy: 'REJECT', status: 'resolved' },
      live_ip: { ip: json?.ip || '185.220.101.42', is_private: false, country: 'Russian Federation', city: 'Moscow', isp: 'Bulletproof Networks Ltd', org: 'BadActor Autonomous System', as: 'AS44192' }
    }
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
