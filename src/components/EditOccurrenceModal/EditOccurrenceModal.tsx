import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { Occurrence } from '../../types'
import { useLanguage } from '../../i18n/LanguageContext'
import type { TranslationKey } from '../../i18n/translations'
import { localDateFromIso, localTimeFromIso } from '../../lib/occurrenceSlot'
import { useAppStore } from '../../store/AppStore'
import '../AddOccurrenceModal/AddOccurrenceModal.css'

export function EditOccurrenceModal({
  occurrence,
  onClose,
  onSaved,
}: {
  occurrence: Occurrence
  onClose: () => void
  onSaved: (occurrence: Occurrence) => void
}) {
  const { getCourse, isExam, updateOccurrence } = useAppStore()
  const { t } = useLanguage()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  const course = getCourse(occurrence.courseFormId)
  const [date, setDate] = useState(() => localDateFromIso(occurrence.start))
  const [startTime, setStartTime] = useState(() => localTimeFromIso(occurrence.start))
  const [endTime, setEndTime] = useState(() => localTimeFromIso(occurrence.end))
  const [title, setTitle] = useState(occurrence.title)
  const [location, setLocation] = useState(occurrence.location ?? '')
  const [asExam, setAsExam] = useState(() => isExam(occurrence.id, occurrence.courseFormId))
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
    const result = updateOccurrence(occurrence.id, {
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
    onSaved(result.occurrence)
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
          <h2 id={titleId}>{t('editEvent')}</h2>
          <p className="add-occ-sub">
            {course?.name ?? occurrence.title}
            {course?.type ? ` · ${course.type}` : ''}
          </p>
        </div>

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
              {t('saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
