import { format, parseISO } from 'date-fns'
import type { Occurrence } from '../../types'
import { useAppStore } from '../../store/AppStore'
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
  } = useAppStore()

  const course = getCourse(occurrence.courseFormId)
  const absent = isAbsent(occurrence.id, occurrence.courseFormId)
  const exam = isExam(occurrence.id, occurrence.courseFormId)
  const remaining = course ? remainingAbsences(course) : 0

  return (
    <div
      className="occ-popover"
      style={{ left: x, top: y }}
      role="dialog"
      aria-label="Class actions"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="occ-popover-head">
        <strong>{course?.name ?? occurrence.title}</strong>
        {course?.type && <span className="badge">{course.type}</span>}
      </div>
      <p className="occ-meta">
        {format(parseISO(occurrence.start), 'EEE d MMM · HH:mm')}
        {occurrence.location ? ` · ${occurrence.location}` : ''}
      </p>
      {course && (
        <p className="occ-meta">
          Absences: {course.absences.filter((a) => a.status === 'absent').length}/
          {course.maxAbsences} ({remaining} left)
        </p>
      )}
      <div className="occ-actions">
        {absent ? (
          <button
            type="button"
            className="btn"
            onClick={() => clearAbsence(occurrence.id, occurrence.courseFormId)}
          >
            Clear absence
          </button>
        ) : (
          <button type="button" className="btn danger" onClick={() => markAbsent(occurrence)}>
            Mark absent
          </button>
        )}
        <button
          type="button"
          className={exam ? 'btn active' : 'btn'}
          onClick={() => toggleExamTag(occurrence.id, occurrence.courseFormId)}
        >
          {exam ? 'Unmark exam' : 'Tag as exam'}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setSelectedCourseId(occurrence.courseFormId)
            onClose()
          }}
        >
          Open course
        </button>
      </div>
    </div>
  )
}
