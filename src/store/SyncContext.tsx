import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppState } from '../types'
import {
  getValidAccessToken,
  isGoogleSyncConfigured,
  restoreGoogleSession,
  signInWithGoogle,
  signOutFromGoogle,
  type GoogleSession,
  type GoogleUserProfile,
} from '../lib/googleAuth'
import {
  clearDriveData,
  loadFromDrive,
  pickNewerState,
  saveToDrive,
} from '../lib/googleDrive'
import { defaultStore } from './dataStore'
import { useAppStore } from './AppStore'

export type SyncStatus =
  | 'idle'
  | 'signing-in'
  | 'syncing'
  | 'synced'
  | 'error'
  | 'unavailable'

interface SyncContextValue {
  configured: boolean
  status: SyncStatus
  profile: GoogleUserProfile | null
  lastSyncedAt: string | null
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
  clearRemote: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

const SAVE_DEBOUNCE_MS = 1200

export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, ready, replaceState } = useAppStore()
  const configured = isGoogleSyncConfigured()

  const [session, setSession] = useState<GoogleSession | null>(null)
  const [status, setStatus] = useState<SyncStatus>(
    configured ? 'idle' : 'unavailable',
  )
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bootstrapped, setBootstrapped] = useState(false)

  const fileIdRef = useRef<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNextPushRef = useRef(false)
  /** Blocks debounced pushes during initial connect / pull. */
  const suppressPushRef = useRef(false)
  const sessionRef = useRef<GoogleSession | null>(null)
  sessionRef.current = session

  const stateRef = useRef(state)
  stateRef.current = state

  const applyRemoteOrLocal = useCallback(
    async (accessToken: string, localState: AppState) => {
      const remote = await loadFromDrive(accessToken)
      if (remote) fileIdRef.current = remote.fileId

      const picked = pickNewerState(
        { state: localState, updatedAt: defaultStore.getUpdatedAt() },
        remote,
      )

      if (picked.source === 'remote') {
        skipNextPushRef.current = true
        replaceState(picked.state)
        setLastSyncedAt(remote?.updatedAt ?? new Date().toISOString())
      } else {
        const saved = await saveToDrive(
          accessToken,
          picked.state,
          fileIdRef.current,
        )
        fileIdRef.current = saved.fileId
        setLastSyncedAt(saved.updatedAt)
      }
    },
    [replaceState],
  )

  // Restore session from sessionStorage once local data is ready
  useEffect(() => {
    if (!configured || !ready || bootstrapped) return
    let cancelled = false

    ;(async () => {
      const restored = await restoreGoogleSession()
      if (cancelled) return
      if (!restored) {
        setBootstrapped(true)
        return
      }

      suppressPushRef.current = true
      setSession(restored)
      setStatus('syncing')
      setError(null)
      try {
        await applyRemoteOrLocal(restored.accessToken, stateRef.current)
        if (!cancelled) setStatus('synced')
      } catch (e) {
        if (!cancelled) {
          setStatus('error')
          setError(e instanceof Error ? e.message : 'Sync failed')
        }
      } finally {
        suppressPushRef.current = false
        if (!cancelled) setBootstrapped(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applyRemoteOrLocal, bootstrapped, configured, ready])

  const signIn = useCallback(async () => {
    if (!configured) return
    setStatus('signing-in')
    setError(null)
    suppressPushRef.current = true
    try {
      const next = await signInWithGoogle()
      setStatus('syncing')
      await applyRemoteOrLocal(next.accessToken, stateRef.current)
      setSession(next)
      setBootstrapped(true)
      setStatus('synced')
    } catch (e) {
      setSession(null)
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      suppressPushRef.current = false
    }
  }, [applyRemoteOrLocal, configured])

  const signOut = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const current = sessionRef.current
    setSession(null)
    fileIdRef.current = null
    setLastSyncedAt(null)
    setError(null)
    setStatus(configured ? 'idle' : 'unavailable')
    await signOutFromGoogle(current)
  }, [configured])

  const pushToDrive = useCallback(async (nextState: AppState) => {
    const current = sessionRef.current
    const token = getValidAccessToken(current)
    if (!token) {
      if (current) {
        setStatus('error')
        setError('Session expired — sign in again')
        setSession(null)
      }
      return
    }
    setStatus('syncing')
    setError(null)
    try {
      const saved = await saveToDrive(token, nextState, fileIdRef.current)
      fileIdRef.current = saved.fileId
      setLastSyncedAt(saved.updatedAt)
      setStatus('synced')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Sync failed')
    }
  }, [])

  const syncNow = useCallback(async () => {
    const current = sessionRef.current
    const token = getValidAccessToken(current)
    if (!token) {
      await signIn()
      return
    }
    setStatus('syncing')
    setError(null)
    suppressPushRef.current = true
    try {
      await applyRemoteOrLocal(token, stateRef.current)
      setStatus('synced')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      suppressPushRef.current = false
    }
  }, [applyRemoteOrLocal, signIn])

  const clearRemote = useCallback(async () => {
    const token = getValidAccessToken(sessionRef.current)
    if (!token) return
    await clearDriveData(token, fileIdRef.current)
    fileIdRef.current = null
  }, [])

  // Debounced push when app state changes while signed in
  useEffect(() => {
    if (!session || !ready || !bootstrapped) return
    if (suppressPushRef.current) return
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      if (suppressPushRef.current) return
      void pushToDrive(state)
    }, SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [state, session, ready, bootstrapped, pushToDrive])

  const value = useMemo<SyncContextValue>(
    () => ({
      configured,
      status,
      profile: session?.profile ?? null,
      lastSyncedAt,
      error,
      signIn,
      signOut,
      syncNow,
      clearRemote,
    }),
    [
      configured,
      status,
      session?.profile,
      lastSyncedAt,
      error,
      signIn,
      signOut,
      syncNow,
      clearRemote,
    ],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}