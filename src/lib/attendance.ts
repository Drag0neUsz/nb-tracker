import type { CourseForm } from '../types'

export function countUsedAbsences(course: CourseForm): number {
  return course.absences.filter((a) => a.status === 'absent').length
}

export function getAbsenceForOccurrence(course: CourseForm, occurrenceId: string) {
  return course.absences.find((a) => a.occurrenceId === occurrenceId)
}

export function getOverrides(course: CourseForm, occurrenceId: string) {
  return (
    course.occurrenceOverrides.find((o) => o.occurrenceId === occurrenceId) ?? {
      occurrenceId,
      tags: [] as CourseForm['occurrenceOverrides'][number]['tags'],
      notes: '',
    }
  )
}

export function isExamOccurrence(course: CourseForm, occurrenceId: string): boolean {
  return getOverrides(course, occurrenceId).tags.includes('exam')
}

export function getOccurrenceNotes(course: CourseForm, occurrenceId: string): string {
  return getOverrides(course, occurrenceId).notes ?? ''
}

export function isEmptyOverride(override: {
  tags: CourseForm['occurrenceOverrides'][number]['tags']
  notes?: string
}): boolean {
  return override.tags.length === 0 && !(override.notes ?? '').trim()
}

export function isLimitEnforced(course: CourseForm): boolean {
  return course.limitEnabled !== false
}

export function remainingAbsences(course: CourseForm): number {
  if (!isLimitEnforced(course)) return Number.POSITIVE_INFINITY
  return Math.max(0, course.maxAbsences - countUsedAbsences(course))
}

export function isOverAbsenceLimit(course: CourseForm): boolean {
  if (!isLimitEnforced(course)) return false
  return countUsedAbsences(course) > course.maxAbsences
}
