import type { AppState } from '../types'
import { EMPTY_STATE } from '../types'

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
      const parsed = JSON.parse(raw) as AppState
      if (parsed?.version !== 1 || !Array.isArray(parsed.courseForms)) {
        return { ...EMPTY_STATE }
      }
      return {
        version: 1,
        courseForms: (parsed.courseForms ?? []).map((course) => ({
          ...course,
          absences: (course.absences ?? []).map((absence) => ({
            ...absence,
            status:
              absence.status === 'justified' ? ('justified' as const) : ('absent' as const),
          })),
        })),
        occurrences: parsed.occurrences ?? [],
      }
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
