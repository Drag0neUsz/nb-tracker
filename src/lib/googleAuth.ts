/** Google Identity Services (GIS) OAuth for Drive appDataFolder. */

/** Drive app data + profile so we can show who is signed in (userinfo). */
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')
const TOKEN_STORAGE_KEY = 'nb-tracker:gdrive-token'

export interface GoogleUserProfile {
  email: string
  name: string
  picture?: string
}

export interface GoogleSession {
  accessToken: string
  expiresAt: number
  profile: GoogleUserProfile
}

interface TokenClient {
  requestAccessToken: (override?: { prompt?: string }) => void
}

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

interface GoogleAccountsOauth2 {
  initTokenClient: (config: {
    client_id: string
    scope: string
    callback: (response: TokenResponse) => void
    error_callback?: (error: { type?: string; message?: string }) => void
  }) => TokenClient
  revoke: (token: string, done?: () => void) => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleAccountsOauth2
      }
    }
  }
}

let gisLoadPromise: Promise<void> | null = null

export function getGoogleClientId(): string | undefined {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID
  return typeof id === 'string' && id.trim() ? id.trim() : undefined
}

export function isGoogleSyncConfigured(): boolean {
  return Boolean(getGoogleClientId())
}

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisLoadPromise) return gisLoadPromise

  gisLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-nb-gis="1"]',
    )
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Google Identity Services')),
      )
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.dataset.nbGis = '1'
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })

  return gisLoadPromise
}

function readStoredToken(): GoogleSession | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GoogleSession
    if (
      !parsed?.accessToken ||
      !parsed?.expiresAt ||
      !parsed?.profile?.email ||
      parsed.expiresAt <= Date.now() + 60_000
    ) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    return null
  }
}

function writeStoredToken(session: GoogleSession | null): void {
  if (!session) {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    return
  }
  sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(session))
}

async function fetchUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`userinfo failed (${res.status})`)
  const data = (await res.json()) as {
    email?: string
    name?: string
    picture?: string
  }
  if (!data.email) throw new Error('userinfo missing email')
  return {
    email: data.email,
    name: data.name || data.email,
    picture: data.picture,
  }
}

function requestAccessToken(clientId: string, prompt: '' | 'consent'): Promise<TokenResponse> {
  return new Promise((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2
    if (!oauth2) {
      reject(new Error('Google Identity Services not ready'))
      return
    }

    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: OAUTH_SCOPES,
      callback: (response) => resolve(response),
      error_callback: (error) =>
        reject(new Error(error.message || error.type || 'OAuth error')),
    })

    // After scopes change, force consent so the new token includes email/profile.
    client.requestAccessToken({ prompt })
  })
}

export async function restoreGoogleSession(): Promise<GoogleSession | null> {
  return readStoredToken()
}

export async function signInWithGoogle(): Promise<GoogleSession> {
  const clientId = getGoogleClientId()
  if (!clientId) throw new Error('Google Client ID not configured')

  await loadGisScript()

  // Prefer silent reuse; fall back to consent (also covers scope upgrades).
  let response = await requestAccessToken(clientId, '')
  if (response.error || !response.access_token) {
    response = await requestAccessToken(clientId, 'consent')
  }
  if (response.error || !response.access_token) {
    throw new Error(response.error_description || response.error || 'Sign-in failed')
  }

  let profile: GoogleUserProfile
  try {
    profile = await fetchUserProfile(response.access_token)
  } catch {
    // Token may be missing email/profile from an older grant — force re-consent.
    response = await requestAccessToken(clientId, 'consent')
    if (response.error || !response.access_token) {
      throw new Error(
        response.error_description || response.error || 'Sign-in failed',
      )
    }
    profile = await fetchUserProfile(response.access_token)
  }

  const expiresIn = Number(response.expires_in) || 3600
  const session: GoogleSession = {
    accessToken: response.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
    profile,
  }
  writeStoredToken(session)
  return session
}

export async function signOutFromGoogle(session: GoogleSession | null): Promise<void> {
  writeStoredToken(null)
  if (!session?.accessToken) return
  try {
    await loadGisScript()
    await new Promise<void>((resolve) => {
      window.google?.accounts?.oauth2?.revoke(session.accessToken, () => resolve())
      // Don't hang if revoke callback never fires
      setTimeout(() => resolve(), 1500)
    })
  } catch {
    // ignore revoke failures
  }
}

export function getValidAccessToken(session: GoogleSession | null): string | null {
  if (!session) return null
  if (session.expiresAt <= Date.now() + 60_000) return null
  return session.accessToken
}
