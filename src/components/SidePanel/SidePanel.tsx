import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/AppStore'
import { fetchIcsFromUrl, parseIcsText } from '../../lib/ics'
import { countUsedAbsences, isOverAbsenceLimit, remainingAbsences } from '../../lib/attendance'
import type { AbsenceStatus } from '../../types'
import './SidePanel.css'

export function SidePanel() {
  const {
    state,
    selectedCourseId,
    setSelectedCourseId,
    importIcs,
    clearAll,
    updateCourseForm,
    setAbsenceStatus,
    clearAbsence,
  } = useAppStore()

  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selected = state.courseForms.find((c) => c.id === selectedCourseId)

  const runImport = async (text: string) => {
    const parsed = parseIcsText(text)
    importIcs(parsed)
    setMessage(
      `Imported ${parsed.courseForms.length} course form(s), ${parsed.occurrences.length} class(es).`,
    )
    setError(null)
  }

  const onFile = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const text = await file.text()
      await runImport(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import file.')
    } finally {
      setBusy(false)
    }
  }

  const onUrlImport = async () => {
    if (!url.trim()) return
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const text = await fetchIcsFromUrl(url.trim())
      await runImport(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import from URL.')
    } finally {
      setBusy(false)
    }
  }

  const onClear = async () => {
    if (!confirm('Clear all saved courses, absences, and calendar data?')) return
    await clearAll()
    setMessage('All saved data cleared.')
    setError(null)
  }

  return (
    <aside className="side-panel">
      <div className="brand-block">
        <p className="brand">NB Tracker</p>
        <p className="tagline">Track skippable classes without guessing.</p>
      </div>

      <section className="panel-section">
        <h3>Import calendar</h3>
        <label className="file-btn btn">
          {busy ? 'Working…' : 'Upload .ics file'}
          <input
            type="file"
            accept=".ics,text/calendar"
            hidden
            disabled={busy}
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="url-row">
          <input
            type="url"
            placeholder="Paste USOS .ics URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
          />
          <button type="button" className="btn" disabled={busy || !url.trim()} onClick={() => void onUrlImport()}>
            Fetch
          </button>
        </div>
        {message && <p className="hint ok">{message}</p>}
        {error && <p className="hint err">{error}</p>}
      </section>

      {selected && (
        <section className="panel-section course-detail">
          <h3>
            {selected.name}
            {selected.type ? ` · ${selected.type}` : ''}
          </h3>

          <label className="field">
            Short name
            <input
              value={selected.shortName}
              onChange={(e) =>
                updateCourseForm(selected.id, { shortName: e.target.value })
              }
            />
          </label>

          <label className="field">
            Max absences
            <input
              type="number"
              min={0}
              value={selected.maxAbsences}
              onChange={(e) =>
                updateCourseForm(selected.id, {
                  maxAbsences: Number(e.target.value),
                })
              }
            />
          </label>

          <label className="field">
            Notes
            <textarea
              rows={3}
              value={selected.notes}
              onChange={(e) =>
                updateCourseForm(selected.id, { notes: e.target.value })
              }
              placeholder="Room quirks, makeup rules…"
            />
          </label>

          <div className="absence-log">
            <h4>Absence log</h4>
            {selected.absences.length === 0 ? (
              <p className="hint">No absences marked yet.</p>
            ) : (
              <ul>
                {selected.absences
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((a) => (
                    <li key={a.id} className="absence-row">
                      <span>{format(parseISO(a.date), 'd MMM yyyy')}</span>
                      <select
                        value={a.status === 'justified' ? 'justified' : 'absent'}
                        onChange={(e) =>
                          setAbsenceStatus(
                            selected.id,
                            a.id,
                            e.target.value as AbsenceStatus,
                          )
                        }
                      >
                        <option value="absent">Count</option>
                        <option value="justified">Doesn't count</option>
                      </select>
                      <button
                        type="button"
                        className="absence-remove"
                        aria-label={`Remove absence on ${format(parseISO(a.date), 'd MMM yyyy')}`}
                        title="Remove absence"
                        onClick={() => clearAbsence(a.occurrenceId, selected.id)}
                      >
                        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M3.2 3.2a.75.75 0 0 1 1.06 0L8 6.94l3.74-3.74a.75.75 0 1 1 1.06 1.06L9.06 8l3.74 3.74a.75.75 0 1 1-1.06 1.06L8 9.06l-3.74 3.74a.75.75 0 1 1-1.06-1.06L6.94 8 3.2 4.26a.75.75 0 0 1 0-1.06Z"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <section className="panel-section">
        <div className="section-row">
          <h3>Courses</h3>
          <button type="button" className="btn danger ghost" onClick={() => void onClear()}>
            Clear data
          </button>
        </div>
        {state.courseForms.length === 0 ? (
          <p className="hint">Import a USOS calendar to get started.</p>
        ) : (
          <ul className="course-list">
            {state.courseForms.map((course) => {
              const used = countUsedAbsences(course)
              const left = remainingAbsences(course)
              const overLimit = isOverAbsenceLimit(course)
              const active = course.id === selectedCourseId
              return (
                <li key={course.id}>
                  <button
                    type="button"
                    className={`course-item${active ? ' active' : ''}${overLimit ? ' over-limit' : ''}`}
                    onClick={() => setSelectedCourseId(course.id)}
                  >
                    <span className="course-name">
                      {overLimit && (
                        <svg
                          className="course-warning-icon"
                          viewBox="0 0 16 16"
                          width="13"
                          height="13"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            fill="currentColor"
                            d="M8.85 1.7a1 1 0 0 0-1.7 0L1.2 12.2A1 1 0 0 0 2.05 13.7h11.9a1 1 0 0 0 .85-1.5L8.85 1.7ZM8 5.4c.35 0 .62.28.6.63l-.2 3.4a.4.4 0 0 1-.8 0l-.2-3.4A.61.61 0 0 1 8 5.4Zm0 6.45a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
                          />
                        </svg>
                      )}
                      {course.name}
                      {course.type ? ` · ${course.type}` : ''}
                    </span>
                    <span className={`course-stat${left <= 0 ? ' depleted' : ''}${overLimit ? ' over-limit' : ''}`}>
                      {used}/{course.maxAbsences}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </aside>
  )
}
