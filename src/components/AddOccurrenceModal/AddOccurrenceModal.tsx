import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { CourseForm } from '../../types'
import { useLanguage } from '../../i18n/LanguageContext'
import type { TranslationKey } from '../../i18n/translations'
import { defaultsFromCourse } from '../../lib/occurrenceDefaults'
import { useAppStore } from '../../store/AppStore'
import './AddOccurrenceModal.css'

export function AddOccurrenceModal({
  course,
  onClose,
  onAdded,
}: {
  course: CourseForm
  onClose: () => void
  onAdded: () => void
}) {
  const { state, addManualOccurrence } = useAppStore()
  const { t } = useLanguage()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  const defaults = defaultsFromCourse(course, state.occurrences)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState(defaults.startTime)
  const [endTime, setEndTime] = useState(defaults.endTime)
  const [title, setTitle] = useState(defaults.title)
  const [location, setLocation] = useState(defaults.location)
  const [asExam, setAsExam] = useState(true)
  const [error, setError] = useState<TranslationKey | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLInputElement>('input[type="date"]')?.focus()
  }, [])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!date) return
    setError(null)
    const result = addManualOccurrence({
      courseFormId: course.id,
      date,
      startTime,
      endTime,
      title,
      location,
      asExam,
    })
    if (!result.ok) {
      setError('invalidDateRange')
      return
    }
    onAdded()
    onClose()
  }

  return (
    <div className="add-occ-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="add-occ-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="add-occ-head">
          <h2 id={titleId}>{t('addDate')}</h2>
          <p className="add-occ-sub">
            {course.name}
            {course.type ? ` · ${course.type}` : ''}
          </p>
        </div>

        <p className="hint">{t('extraDatesHint')}</p>

        <form className="add-occ-form" onSubmit={onSubmit}>
          <label className="field">
            {t('date')}
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <div className="time-row">
            <label className="field">
              {t('startTime')}
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>
            <label className="field">
              {t('endTime')}
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>
          </div>

          <label className="field">
            {t('titleOptional')}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
            />
          </label>

          <label className="field">
            {t('location')}
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('locationPlaceholder')}
            />
          </label>

          <label className="check-field">
            <input
              type="checkbox"
              checked={asExam}
              onChange={(e) => setAsExam(e.target.checked)}
            />
            {t('markAsExam')}
          </label>

          {error && <p className="hint err">{t(error)}</p>}

          <div className="add-occ-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn" disabled={!date}>
              {t('saveDate')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
