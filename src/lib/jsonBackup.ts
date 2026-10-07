import type { AppState, CourseForm, Occurrence } from '../types'

export const BACKUP_FORMAT = 'nb-tracker' as const

/** Portable snapshot suitable for file download or future Firebase sync. */
export interface NbTrackerBackup {
  format: typeof BACKUP_FORMAT
  version: 1
  exportedAt: string
  courseForms: CourseForm[]
  occurrences: Occurrence[]
}

export function normalizeAppState(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  // Support wrapped backups and plain AppState
  const payload =
    obj.format === BACKUP_FORMAT && obj.data && typeof obj.data === 'object'
      ? (obj.data as Record<string, unknown>)
      : obj

  if (payload.version !== 1 || !Array.isArray(payload.courseForms)) return null

  const courseForms = (payload.courseForms as CourseForm[]).map((course) => ({
    ...course,
    shortName: course.shortName ?? '',
    notes: course.notes ?? '',
    maxAbsences: Number.isFinite(course.maxAbsences) ? Math.max(0, Math.floor(course.maxAbsences)) : 2,
    absences: (course.absences ?? []).map((absence) => ({
      ...absence,
      status:
        absence.status === 'justified' ? ('justified' as const) : ('absent' as const),
    })),
    occurrenceOverrides: course.occurrenceOverrides ?? [],
  }))

  const occurrences = ((payload.occurrences as Occurrence[] | undefined) ?? []).map((o) => ({
    ...o,
    manual: Boolean(o.manual) || undefined,
  }))

  return {
    version: 1,
    courseForms,
    occurrences,
  }
}

export function buildJsonBackup(state: AppState): NbTrackerBackup {
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    courseForms: state.courseForms,
    occurrences: state.occurrences,
  }
}

export function serializeJsonBackup(state: AppState): string {
  return `${JSON.stringify(buildJsonBackup(state), null, 2)}\n`
}

export function parseJsonBackup(text: string): AppState {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('jsonInvalid')
  }
  const state = normalizeAppState(parsed)
  if (!state) throw new Error('jsonInvalid')
  return state
}

export function downloadJsonFile(
  text: string,
  filename = `nb-tracker-${new Date().toISOString().slice(0, 10)}.json`,
): void {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
