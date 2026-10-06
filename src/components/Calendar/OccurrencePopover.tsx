import { format, parseISO } from 'date-fns'
import type { Occurrence } from '../../types'
import { useAppStore } from '../../store/AppStore'
import { useLanguage } from '../../i18n/LanguageContext'
import { remainingAbsences } from '../../lib/attendance'

export function OccurrencePopover({
  occurrence,
  x,
  y,
  onClose,
}: {
  occurrence: Occurrence
  x: number
  y: number
  onClose: () => void
}) {
  const {
    getCourse,
    isAbsent,
    isExam,
    markAbsent,
    clearAbsence,
    toggleExamTag,
    setSelectedCourseId,
    getOccurrenceNotes,
    setOccurrenceNotes,
  } = useAppStore()
  const { t, dateLocale } = useLanguage()

  const course = getCourse(occurrence.courseFormId)
  const absent = isAbsent(occurrence.id, occurrence.courseFormId)
  const exam = isExam(occurrence.id, occurrence.courseFormId)
  const remaining = course ? remainingAbsences(course) : 0
  const notes = getOccurrenceNotes(occurrence.id, occurrence.courseFormId)

  return (
    <div
      className="occ-popover"
      style={{ left: x, top: y }}
      role="dialog"
      aria-label={t('classActions')}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="occ-popover-head">
        <strong>{course?.name ?? occurrence.title}</strong>
        {course?.type && <span className="badge">{course.type}</span>}
      </div>
      <p className="occ-meta">
        {format(parseISO(occurrence.start), 'EEE d MMM · HH:mm', { locale: dateLocale })}
        {occurrence.location ? ` · ${occurrence.location}` : ''}
      </p>
      {course && (
        <p className="occ-meta">
          {t('absencesStat', {
            used: course.absences.filter((a) => a.status === 'absent').length,
            max: course.maxAbsences,
            left: remaining,
          })}
        </p>
      )}

      <label className="occ-notes">
        {t('notes')}
        <textarea
          rows={3}
          value={notes}
          placeholder={t('occNotesPlaceholder')}
          onChange={(e) =>
            setOccurrenceNotes(occurrence.id, occurrence.courseFormId, e.target.value)
          }
          onClick={(e) => e.stopPropagation()}
        />
      </label>

      <div className="occ-actions">
        {absent ? (
          <button
            type="button"
            className="btn"
            onClick={() => clearAbsence(occurrence.id, occurrence.courseFormId)}
          >
            {t('clearAbsence')}
          </button>
        ) : (
          <button type="button" className="btn danger" onClick={() => markAbsent(occurrence)}>
            {t('markAbsent')}
          </button>
        )}
        <button
          type="button"
          className={exam ? 'btn active' : 'btn'}
          onClick={() => toggleExamTag(occurrence.id, occurrence.courseFormId)}
        >
          {exam ? t('unmarkExam') : t('tagAsExam')}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setSelectedCourseId(occurrence.courseFormId)
            onClose()
          }}
        >
          {t('openCourse')}
        </button>
      </div>
    </div>
  )
}
