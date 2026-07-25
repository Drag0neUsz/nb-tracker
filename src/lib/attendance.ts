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
    }
  )
}

export function isExamOccurrence(course: CourseForm, occurrenceId: string): boolean {
  return getOverrides(course, occurrenceId).tags.includes('exam')
}

export function remainingAbsences(course: CourseForm): number {
  return Math.max(0, course.maxAbsences - countUsedAbsences(course))
}
