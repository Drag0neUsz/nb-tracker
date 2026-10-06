export type AbsenceStatus = 'absent' | 'justified'

export type OccurrenceTag = 'exam'

export type CalendarView = 'week' | 'month'

export interface Absence {
  id: string
  occurrenceId: string
  date: string // YYYY-MM-DD
  status: AbsenceStatus
  note?: string
}

export interface OccurrenceOverride {
  occurrenceId: string
  tags: OccurrenceTag[]
  notes?: string
}

export interface CourseForm {
  id: string
  name: string
  type?: string
  shortName: string
  maxAbsences: number
  notes: string
  absences: Absence[]
  occurrenceOverrides: OccurrenceOverride[]
}

export interface Occurrence {
  id: string
  courseFormId: string
  start: string // ISO
  end: string // ISO
  title: string
  location?: string
  uid?: string
  /** User-added date (e.g. exam outside the ICS plan). Kept across ICS re-imports. */
  manual?: boolean
}

export interface AppState {
  version: 1
  courseForms: CourseForm[]
  occurrences: Occurrence[]
}

export const EMPTY_STATE: AppState = {
  version: 1,
  courseForms: [],
  occurrences: [],
}

export function createId(): string {
  return crypto.randomUUID()
}
