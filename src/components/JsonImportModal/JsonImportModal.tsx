import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { format, parseISO, type Locale } from 'date-fns'
import type { AppState, CourseForm, Occurrence } from '../../types'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  mergeSelectiveImport,
  type JsonImportSelection,
} from '../../lib/jsonBackup'
import './JsonImportModal.css'

function courseLabel(course: CourseForm): string {
  return course.type ? `${course.name} · ${course.type}` : course.name
}

function occurrenceLabel(occ: Occurrence, dateLocale: Locale, manualLabel: string): string {
  const start = parseISO(occ.start)
  const end = parseISO(occ.end)
  const when = `${format(start, 'd MMM yyyy', { locale: dateLocale })} · ${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`
  const bits = [when, occ.title]
  if (occ.location) bits.push(occ.location)
  if (occ.manual) bits.push(manualLabel)
  return bits.join(' · ')
}

export function JsonImportModal({
  imported,
  current,
  onClose,
  onConfirm,
}: {
  imported: AppState
  current: AppState
  onClose: () => void
  onConfirm: (
    next: AppState,
    stats: { courses: number; classes: number },
  ) => void
}) {
  const { t, dateLocale } = useLanguage()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  const courses = useMemo(
    () =>
      imported.courseForms
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [imported.courseForms],
  )

  const occsByCourse = useMemo(() => {
    const map = new Map<string, Occurrence[]>()
    for (const occ of imported.occurrences) {
      const list = map.get(occ.courseFormId) ?? []
      list.push(occ)
      map.set(occ.courseFormId, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start.localeCompare(b.start))
    }
    return map
  }, [imported.occurrences])

  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(
    () => new Set(courses.map((c) => c.id)),
  )
  const [selectedOccs, setSelectedOccs] = useState<Set<string>>(
    () => new Set(imported.occurrences.map((o) => o.id)),
  )
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const toggleExpanded = (courseId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  const setCourseSelected = (courseId: string, on: boolean) => {
    const courseOccIds = (occsByCourse.get(courseId) ?? []).map((o) => o.id)
    setSelectedCourses((prev) => {
      const next = new Set(prev)
      if (on) next.add(courseId)
      else next.delete(courseId)
      return next
    })
    setSelectedOccs((prev) => {
      const next = new Set(prev)
      for (const id of courseOccIds) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const setOccSelected = (courseId: string, occId: string, on: boolean) => {
    const courseOccIds = (occsByCourse.get(courseId) ?? []).map((o) => o.id)
    setSelectedOccs((prev) => {
      const next = new Set(prev)
      if (on) next.add(occId)
      else next.delete(occId)

      const anySelected = courseOccIds.some((id) => next.has(id))
      setSelectedCourses((coursesPrev) => {
        const coursesNext = new Set(coursesPrev)
        if (anySelected) coursesNext.add(courseId)
        else coursesNext.delete(courseId)
        return coursesNext
      })
      return next
    })
  }

  const selectAll = () => {
    setSelectedCourses(new Set(courses.map((c) => c.id)))
    setSelectedOccs(new Set(imported.occurrences.map((o) => o.id)))
  }

  const selectNone = () => {
    setSelectedCourses(new Set())
    setSelectedOccs(new Set())
  }

  const selectedCount = {
    courses: selectedCourses.size,
    classes: selectedOccs.size,
  }

  const canImport = selectedCourses.size > 0

  const onSubmit = () => {
    if (!canImport) return
    const selection: JsonImportSelection = {
      courseIds: selectedCourses,
      occurrenceIds: selectedOccs,
    }
    onConfirm(mergeSelectiveImport(current, imported, selection), {
      courses: selectedCourses.size,
      classes: selectedOccs.size,
    })
  }

  return (
    <div className="json-import-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="json-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="json-import-head">
          <h2 id={titleId}>{t('jsonImportTitle')}</h2>
          <p className="json-import-sub">{t('jsonImportHint')}</p>
        </div>

        <div className="json-import-toolbar">
          <button type="button" className="btn ghost" onClick={selectAll}>
            {t('selectAll')}
          </button>
          <button type="button" className="btn ghost" onClick={selectNone}>
            {t('selectNone')}
          </button>
          <span className="json-import-count">
            {t('jsonImportSelection', {
              courses: selectedCount.courses,
              classes: selectedCount.classes,
            })}
          </span>
        </div>

        <ul className="json-import-tree">
          {courses.map((course) => {
            const occs = occsByCourse.get(course.id) ?? []
            const isOpen = expanded.has(course.id)
            const courseOn = selectedCourses.has(course.id)
            const selectedInCourse = occs.filter((o) => selectedOccs.has(o.id)).length
            const allOccsOn = occs.length > 0 && selectedInCourse === occs.length
            const someOccsOn = selectedInCourse > 0 && !allOccsOn

            return (
              <li key={course.id} className="json-import-course">
                <div className="json-import-course-row">
                  <button
                    type="button"
                    className={`json-import-chevron${isOpen ? ' open' : ''}`}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? t('collapseCourse') : t('expandCourse')}
                    onClick={() => toggleExpanded(course.id)}
                  >
                    ▸
                  </button>
                  <label className="json-import-check">
                    <input
                      type="checkbox"
                      checked={courseOn && (occs.length === 0 || allOccsOn)}
                      ref={(el) => {
                        if (el) el.indeterminate = someOccsOn
                      }}
                      onChange={(e) => setCourseSelected(course.id, e.target.checked)}
                    />
                    <span className="json-import-course-name">{courseLabel(course)}</span>
                    <span className="json-import-course-meta">
                      {selectedInCourse}/{occs.length}
                    </span>
                  </label>
                </div>

                {isOpen && (
                  <ul className="json-import-occs">
                    {occs.length === 0 ? (
                      <li className="json-import-empty">{t('jsonImportNoOccs')}</li>
                    ) : (
                      occs.map((occ) => (
                        <li key={occ.id}>
                          <label className="json-import-check nested">
                            <input
                              type="checkbox"
                              checked={selectedOccs.has(occ.id)}
                              onChange={(e) =>
                                setOccSelected(course.id, occ.id, e.target.checked)
                              }
                            />
                            <span>{occurrenceLabel(occ, dateLocale, t('manualTag'))}</span>
                          </label>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>

        <div className="json-import-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className="btn" disabled={!canImport} onClick={onSubmit}>
            {t('jsonImportApply')}
          </button>
        </div>
      </div>
    </div>
  )
}
