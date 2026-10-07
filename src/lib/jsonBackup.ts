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

export interface JsonImportSelection {
  /** Course form ids included in the import. */
  courseIds: Set<string>
  /** Occurrence ids included in the import. */
  occurrenceIds: Set<string>
}

/** Build app state from an imported backup using hierarchical course/occurrence selection. */
export function filterImportedState(
  imported: AppState,
  selection: JsonImportSelection,
): AppState {
  const courseForms = imported.courseForms
    .filter((c) => selection.courseIds.has(c.id))
    .map((course) => {
      const keptOccIds = new Set(
        imported.occurrences
          .filter(
            (o) =>
              o.courseFormId === course.id && selection.occurrenceIds.has(o.id),
          )
          .map((o) => o.id),
      )
      return {
        ...course,
        absences: course.absences.filter((a) => keptOccIds.has(a.occurrenceId)),
        occurrenceOverrides: course.occurrenceOverrides.filter((o) =>
          keptOccIds.has(o.occurrenceId),
        ),
      }
    })

  const keptCourseIds = new Set(courseForms.map((c) => c.id))
  const occurrences = imported.occurrences.filter(
    (o) =>
      keptCourseIds.has(o.courseFormId) && selection.occurrenceIds.has(o.id),
  )

  return {
    version: 1,
    courseForms,
    occurrences,
  }
}

/**
 * Merge selected imported data into the current app state.
 * Selected courses overwrite matching ids (or are added); other local courses stay.
 * For each selected course, its calendar occurrences are replaced by the selected imported ones.
 */
export function mergeSelectiveImport(
  current: AppState,
  imported: AppState,
  selection: JsonImportSelection,
): AppState {
  const filtered = filterImportedState(imported, selection)
  if (filtered.courseForms.length === 0) return current

  const importedCourseIds = new Set(filtered.courseForms.map((c) => c.id))
  const formsById = new Map(current.courseForms.map((c) => [c.id, c]))
  for (const course of filtered.courseForms) {
    formsById.set(course.id, course)
  }

  const keptOccurrences = current.occurrences.filter(
    (o) => !importedCourseIds.has(o.courseFormId),
  )

  return {
    version: 1,
    courseForms: [...formsById.values()],
    occurrences: [...keptOccurrences, ...filtered.occurrences],
  }
}
