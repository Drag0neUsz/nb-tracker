import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/AppStore'
import { fetchIcsFromUrl, parseIcsText } from '../../lib/ics'
import { countUsedAbsences, remainingAbsences } from '../../lib/attendance'
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
              const active = course.id === selectedCourseId
              return (
                <li key={course.id}>
                  <button
                    type="button"
                    className={active ? 'course-item active' : 'course-item'}
                    onClick={() =>
                      setSelectedCourseId(active ? null : course.id)
                    }
                  >
                    <span className="course-name">
                      {course.name}
                      {course.type ? ` · ${course.type}` : ''}
                    </span>
                    <span className={`course-stat${left <= 0 ? ' depleted' : ''}`}>
                      {used}/{course.maxAbsences}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
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
                        value={a.status}
                        onChange={(e) =>
                          setAbsenceStatus(
                            selected.id,
                            a.id,
                            e.target.value as AbsenceStatus,
                          )
                        }
                      >
                        <option value="absent">Absent</option>
                        <option value="justified">Justified</option>
                        <option value="revoked">Revoked</option>
                      </select>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <div className="legend">
        <span><i className="swatch green" /> Can skip</span>
        <span><i className="swatch orange" /> Cap used</span>
        <span><i className="swatch red" /> Exam</span>
      </div>
    </aside>
  )
}
