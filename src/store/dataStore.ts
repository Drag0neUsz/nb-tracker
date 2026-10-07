import type { AppState } from '../types'
import { EMPTY_STATE } from '../types'
import { normalizeAppState } from '../lib/jsonBackup'

export interface DataStore {
  load(): Promise<AppState>
  save(state: AppState): Promise<void>
  clear(): Promise<void>
}

const STORAGE_KEY = 'nb-tracker:v1'

export class LocalStorageStore implements DataStore {
  async load(): Promise<AppState> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return { ...EMPTY_STATE }
      return normalizeAppState(JSON.parse(raw)) ?? { ...EMPTY_STATE }
    } catch {
      return { ...EMPTY_STATE }
    }
  }

  async save(state: AppState): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export const defaultStore = new LocalStorageStore()
