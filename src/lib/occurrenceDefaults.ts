import type { CourseForm, Occurrence } from '../types'

export interface OccurrenceDefaults {
  title: string
  startTime: string
  endTime: string
  location: string
}

function modeOf(values: string[]): string | undefined {
  const counts = new Map<string, number>()
  let best: string | undefined
  let bestCount = 0
  for (const value of values) {
    if (!value) continue
    const next = (counts.get(value) ?? 0) + 1
    counts.set(value, next)
    if (next > bestCount) {
      best = value
      bestCount = next
    }
  }
  return best
}

function localHm(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Prefill add-date form from the most common ICS details for a course. */
export function defaultsFromCourse(
  course: CourseForm,
  occurrences: Occurrence[],
): OccurrenceDefaults {
  const ics = occurrences.filter((o) => o.courseFormId === course.id && !o.manual)
  const sample = ics.length > 0 ? ics : occurrences.filter((o) => o.courseFormId === course.id)

  if (sample.length === 0) {
    return {
      title: course.name,
      startTime: '09:00',
      endTime: '11:00',
      location: '',
    }
  }

  const titles = sample.map((o) => o.title)
  const starts = sample.map((o) => localHm(o.start))
  const ends = sample.map((o) => localHm(o.end))
  const locations = sample.map((o) => o.location?.trim() ?? '').filter(Boolean)

  return {
    title: modeOf(titles) ?? course.name,
    startTime: modeOf(starts) ?? '09:00',
    endTime: modeOf(ends) ?? '11:00',
    location: modeOf(locations) ?? '',
  }
}
