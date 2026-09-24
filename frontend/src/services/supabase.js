/**
 * MailTrace AI — Supabase Realtime Telemetry Client
 * Connects directly to Supabase PostgreSQL Realtime channels to receive instant notifications
 * when new emails are intercepted or security incidents are triggered.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/**
 * Trigger Supabase Google OAuth Login
 */
export function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase URL and Key are not configured.')
  }
  const redirectUrl = `${window.location.origin}/auth`
  const authEndpoint = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`
  window.location.href = authEndpoint
}

/**
 * Parses access token from URL hash if redirected back from Supabase Google OAuth
 */
export async function parseSupabaseAuthSession() {
  const hash = window.location.hash
  if (!hash || !hash.includes('access_token=')) {
    return null
  }

  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const accessToken = params.get('access_token')

  if (!accessToken) return null

  try {
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`
      }
    })
    if (!res.ok) return null
    const userData = await res.json()
    
    // Clean URL hash
    window.history.replaceState(null, '', window.location.pathname)

    return {
      name: userData.user_metadata?.full_name || userData.user_metadata?.name || userData.email.split('@')[0],
      email: userData.email,
      role: 'SOC Analyst',
      avatar: userData.user_metadata?.avatar_url || userData.email[0].toUpperCase(),
      provider: 'google',
      loginTime: new Date().toISOString()
    }
  } catch (err) {
    console.error('[Supabase Auth Error]', err)
    return null
  }
}

