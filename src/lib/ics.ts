import ICAL from 'ical.js'
import {
  addMonths,
  isBefore,
  isAfter,
  parseISO,
} from 'date-fns'
import type { AppState, CourseForm, Occurrence } from '../types'
import { createId } from '../types'

export interface ParsedIcsImport {
  courseForms: CourseForm[]
  occurrences: Occurrence[]
}

const TYPE_PATTERNS: { re: RegExp; type: string }[] = [
  { re: /\b(wyk(?:ład|lad)|lecture|wyk)\b/i, type: 'lecture' },
  { re: /\b(ćw(?:iczenia)?|cw(?:iczenia)?|exercises?|tutorial)\b/i, type: 'exercises' },
  { re: /\b(lab(?:orator(?:ium|ia|y))?|labs?)\b/i, type: 'lab' },
  { re: /\b(sem(?:inarium)?|seminar)\b/i, type: 'seminar' },
  { re: /\b(proj(?:ekt)?|project)\b/i, type: 'project' },
]

function detectType(summary: string): string | undefined {
  for (const { re, type } of TYPE_PATTERNS) {
    if (re.test(summary)) return type
  }
  return undefined
}

function stripTypeFromName(summary: string): string {
  let name = summary
    .replace(/\s*[-–—|:]\s*(wyk(?:ład|lad)|lecture|ćw(?:iczenia)?|cw(?:iczenia)?|lab(?:orator(?:ium|ia|y))?|sem(?:inarium)?|proj(?:ekt)?).*$/i, '')
    .replace(/\s*\((wyk(?:ład|lad)|lecture|ćw(?:iczenia)?|cw(?:iczenia)?|lab(?:orator(?:ium|ia|y))?|sem(?:inarium)?|proj(?:ekt)?).*\)\s*$/i, '')
    .trim()
  if (!name) name = summary.trim()
  return name
}

function shortNameFrom(name: string, type?: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  let base =
    words.length === 1
      ? words[0].slice(0, 6)
      : words
          .slice(0, 3)
          .map((w) => w[0])
          .join('')
          .toUpperCase()
  if (type) {
    const typeShort: Record<string, string> = {
      lecture: 'W',
      exercises: 'Ć',
      lab: 'L',
      seminar: 'S',
      project: 'P',
    }
    base = `${base}${typeShort[type] ?? type[0]?.toUpperCase() ?? ''}`
  }
  return base.slice(0, 8)
}

function formKey(name: string, type?: string): string {
  return `${name.toLowerCase().trim()}::${(type ?? 'other').toLowerCase()}`
}

function occurrenceId(uid: string, startIso: string): string {
  return `${uid}__${startIso}`
}

function toIso(time: { toJSDate(): Date }): string {
  return time.toJSDate().toISOString()
}

export async function fetchIcsFromUrl(url: string): Promise<string> {
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new Error('icsCors')
  }
  if (!response.ok) {
    throw new Error(`icsDownloadFailed:${response.status}`)
  }
  const text = await response.text()
  if (!text.includes('BEGIN:VCALENDAR') && !text.includes('BEGIN:VEVENT')) {
    throw new Error('icsInvalid')
  }
  return text
}

export function parseIcsText(
  icsText: string,
  rangeStart = new Date(),
  rangeMonths = 6,
): { courseForms: CourseForm[]; occurrences: Occurrence[] } {
  const jcal = ICAL.parse(icsText)
  const comp = new ICAL.Component(jcal)
  const vevents = comp.getAllSubcomponents('vevent')
  const rangeEnd = addMonths(rangeStart, rangeMonths)

  const formsByKey = new Map<string, CourseForm>()
  const occurrences: Occurrence[] = []

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent)
    const summary = event.summary?.trim() || 'Untitled'
    const type = detectType(summary)
    const name = stripTypeFromName(summary)
    const key = formKey(name, type)

    let form = formsByKey.get(key)
    if (!form) {
      form = {
        id: createId(),
        name,
        type,
        shortName: shortNameFrom(name, type),
        maxAbsences: 2,
        limitEnabled: true,
        notes: '',
        absences: [],
        occurrenceOverrides: [],
      }
      formsByKey.set(key, form)
    }

    const uid = event.uid || createId()
    const location = event.location || undefined

    const expand = (start: { toJSDate(): Date }, end: { toJSDate(): Date }) => {
      const startIso = toIso(start)
      const endIso = toIso(end)
      const startDate = parseISO(startIso)
      if (isBefore(startDate, rangeStart) && isBefore(parseISO(endIso), rangeStart)) return
      if (isAfter(startDate, rangeEnd)) return

      occurrences.push({
        id: occurrenceId(uid, startIso),
        courseFormId: form!.id,
        start: startIso,
        end: endIso,
        title: summary,
        location,
        uid,
      })
    }

    if (event.isRecurring()) {
      const iterator = event.iterator()
      let next = iterator.next()
      let guard = 0
      while (next && guard < 500) {
        const detail = event.getOccurrenceDetails(next)
        expand(detail.startDate, detail.endDate)
        if (isAfter(detail.startDate.toJSDate(), rangeEnd)) break
        next = iterator.next()
        guard += 1
      }
    } else {
      expand(event.startDate, event.endDate)
    }
  }

  return {
    courseForms: [...formsByKey.values()],
    occurrences,
  }
}

export function mergeIcsImport(
  existing: AppState,
  parsed: { courseForms: CourseForm[]; occurrences: Occurrence[] },
): AppState {
  const forms = [...existing.courseForms]
  const idRemap = new Map<string, string>()

  for (const incoming of parsed.courseForms) {
    const match = forms.find(
      (f) => formKey(f.name, f.type) === formKey(incoming.name, incoming.type),
    )
    if (match) {
      idRemap.set(incoming.id, match.id)
    } else {
      forms.push(incoming)
      idRemap.set(incoming.id, incoming.id)
    }
  }

  const remapped = parsed.occurrences.map((o) => ({
    ...o,
    courseFormId: idRemap.get(o.courseFormId) ?? o.courseFormId,
  }))

  const keptIds = new Set(remapped.map((o) => o.id))
  const preserved = existing.occurrences.filter((o) => !keptIds.has(o.id))
  // Replace ICS occurrences for refreshed forms, but keep user-added dates
  const importedFormIds = new Set(remapped.map((o) => o.courseFormId))
  const preservedOutsideImport = preserved.filter(
    (o) => !importedFormIds.has(o.courseFormId),
  )
  const preservedManual = preserved.filter(
    (o) => o.manual && importedFormIds.has(o.courseFormId),
  )

  return {
    version: 1,
    courseForms: forms,
    occurrences: [...preservedOutsideImport, ...preservedManual, ...remapped],
  }
}

function foldIcsLine(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = []
  let remaining = line
  parts.push(remaining.slice(0, 75))
  remaining = remaining.slice(75)
  while (remaining.length > 0) {
    parts.push(` ${remaining.slice(0, 74)}`)
    remaining = remaining.slice(74)
  }
  return parts.join('\r\n')
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n')
}

/** Format a Date as UTC ICS datetime: YYYYMMDDTHHMMSSZ */
function toIcsUtc(iso: string): string {
  const d = parseISO(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

function buildDescription(course: CourseForm | undefined, occurrence: Occurrence): string | undefined {
  const parts: string[] = []
  if (course) {
    const override = course.occurrenceOverrides.find((o) => o.occurrenceId === occurrence.id)
    if (override?.tags.includes('exam')) parts.push('Exam')
    const occNotes = override?.notes?.trim()
    if (occNotes) parts.push(occNotes)
    if (course.notes.trim()) parts.push(course.notes.trim())
  }
  if (occurrence.manual) parts.push('Added manually in NB Tracker')
  return parts.length > 0 ? parts.join('\n') : undefined
}

/** Build a VCALENDAR string from the current app occurrences (including manual dates). */
export function buildIcsExport(state: AppState): string {
  const courses = new Map(state.courseForms.map((c) => [c.id, c]))
  const stamp = toIcsUtc(new Date().toISOString())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NB Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  const sorted = state.occurrences
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))

  for (const occ of sorted) {
    const course = courses.get(occ.courseFormId)
    const uid = occ.uid || occ.id
    const description = buildDescription(course, occ)

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${escapeIcsText(uid)}`)
    lines.push(`DTSTAMP:${stamp}`)
    lines.push(`DTSTART:${toIcsUtc(occ.start)}`)
    lines.push(`DTEND:${toIcsUtc(occ.end)}`)
    lines.push(`SUMMARY:${escapeIcsText(occ.title)}`)
    if (occ.location) lines.push(`LOCATION:${escapeIcsText(occ.location)}`)
    if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.map(foldIcsLine).join('\r\n') + '\r\n'
}

export function downloadIcsFile(
  icsText: string,
  filename = `nb-tracker-${new Date().toISOString().slice(0, 10)}.ics`,
): void {
  const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' })
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

