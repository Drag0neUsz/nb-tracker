import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/AppStore'
import { useLanguage } from '../../i18n/LanguageContext'
import { fetchIcsFromUrl, parseIcsText, buildIcsExport, downloadIcsFile } from '../../lib/ics'
import {
  downloadJsonFile,
  parseJsonBackup,
  serializeJsonBackup,
} from '../../lib/jsonBackup'
import { countUsedAbsences, isOverAbsenceLimit, remainingAbsences } from '../../lib/attendance'
import type { AbsenceStatus } from '../../types'
import type { MessageParams, TranslationKey } from '../../i18n/translations'
import { AddOccurrenceModal } from '../AddOccurrenceModal/AddOccurrenceModal'
import './SidePanel.css'

type StatusMessage =
  | { kind: 'ok'; key: TranslationKey; params?: MessageParams }
  | { kind: 'err'; key: TranslationKey; params?: MessageParams }
  | { kind: 'err'; raw: string }

function icsErrorFromMessage(message: string): StatusMessage {
  if (message === 'icsCors') return { kind: 'err', key: 'icsCors' }
  if (message === 'icsInvalid') return { kind: 'err', key: 'icsInvalid' }
  if (message.startsWith('icsDownloadFailed:')) {
    return {
      kind: 'err',
      key: 'icsDownloadFailed',
      params: { status: message.slice('icsDownloadFailed:'.length) },
    }
  }
  return { kind: 'err', raw: message }
}

export function SidePanel() {
  const {
    state,
    selectedCourseId,
    setSelectedCourseId,
    importIcs,
    replaceState,
    clearAll,
    updateCourseForm,
    removeOccurrence,
    setAbsenceStatus,
    clearAbsence,
    isExam,
  } = useAppStore()
  const { t, dateLocale } = useLanguage()

  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<StatusMessage | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const selected = state.courseForms.find((c) => c.id === selectedCourseId)
  const manualOccurrences = selected
    ? state.occurrences
        .filter((o) => o.courseFormId === selected.id && o.manual)
        .slice()
        .sort((a, b) => a.start.localeCompare(b.start))
    : []

  const runImport = async (text: string) => {
    const parsed = parseIcsText(text)
    importIcs(parsed)
    setStatus({
      kind: 'ok',
      key: 'imported',
      params: {
        courses: parsed.courseForms.length,
        classes: parsed.occurrences.length,
      },
    })
  }

  const onFile = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    setStatus(null)
    try {
      const text = await file.text()
      await runImport(text)
    } catch (e) {
      setStatus(
        e instanceof Error
          ? { kind: 'err', raw: e.message }
          : { kind: 'err', key: 'failedImportFile' },
      )
    } finally {
      setBusy(false)
    }
  }

  const onUrlImport = async () => {
    if (!url.trim()) return
    setBusy(true)
    setStatus(null)
    try {
      const text = await fetchIcsFromUrl(url.trim())
      await runImport(text)
    } catch (e) {
      setStatus(
        e instanceof Error
          ? icsErrorFromMessage(e.message)
          : { kind: 'err', key: 'failedImportUrl' },
      )
    } finally {
      setBusy(false)
    }
  }

  const onClear = async () => {
    if (!confirm(t('clearConfirm'))) return
    await clearAll()
    setStatus({ kind: 'ok', key: 'cleared' })
  }

  const onExportIcs = () => {
    if (state.occurrences.length === 0) {
      setStatus({ kind: 'err', key: 'nothingToExport' })
      return
    }
    try {
      downloadIcsFile(buildIcsExport(state))
      setStatus({
        kind: 'ok',
        key: 'exported',
        params: { classes: state.occurrences.length },
      })
    } catch (e) {
      setStatus(
        e instanceof Error
          ? { kind: 'err', raw: e.message }
          : { kind: 'err', key: 'nothingToExport' },
      )
    }
  }

  const onExportJson = () => {
    if (state.courseForms.length === 0 && state.occurrences.length === 0) {
      setStatus({ kind: 'err', key: 'nothingToExport' })
      return
    }
    try {
      downloadJsonFile(serializeJsonBackup(state))
      setStatus({ kind: 'ok', key: 'exportedJson' })
    } catch (e) {
      setStatus(
        e instanceof Error
          ? { kind: 'err', raw: e.message }
          : { kind: 'err', key: 'nothingToExport' },
      )
    }
  }

  const onJsonFile = async (file: File | null) => {
    if (!file) return
    if (!confirm(t('jsonImportConfirm'))) return
    setBusy(true)
    setStatus(null)
    try {
      const text = await file.text()
      const next = parseJsonBackup(text)
      replaceState(next)
      setStatus({
        kind: 'ok',
        key: 'importedJson',
        params: {
          courses: next.courseForms.length,
          classes: next.occurrences.length,
        },
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : ''
      setStatus(
        message === 'jsonInvalid'
          ? { kind: 'err', key: 'jsonInvalid' }
          : e instanceof Error
            ? { kind: 'err', raw: e.message }
            : { kind: 'err', key: 'failedImportFile' },
      )
    } finally {
      setBusy(false)
    }
  }

  const statusText =
    status == null
      ? null
      : 'raw' in status
        ? status.raw
        : t(status.key, status.params)

  return (
    <aside className="side-panel">
      <div className="brand-block">
        <p className="brand">{t('brand')}</p>
        <p className="tagline">{t('tagline')}</p>
      </div>

      <section className="panel-section">
        <h3>{t('importCalendar')}</h3>
        <div className="io-grid">
          <label className="file-btn btn">
            {busy ? t('working') : t('uploadIcs')}
            <input
              type="file"
              accept=".ics,text/calendar"
              hidden
              disabled={busy}
              onChange={(e) => {
                void onFile(e.target.files?.[0] ?? null)
                e.target.value = ''
              }}
            />
          </label>
          <button
            type="button"
            className="btn"
            disabled={busy || state.occurrences.length === 0}
            onClick={onExportIcs}
          >
            {t('exportIcs')}
          </button>
          <label className="file-btn btn">
            {busy ? t('working') : t('uploadJson')}
            <input
              type="file"
              accept=".json,application/json"
              hidden
              disabled={busy}
              onChange={(e) => {
                void onJsonFile(e.target.files?.[0] ?? null)
                e.target.value = ''
              }}
            />
          </label>
          <button
            type="button"
            className="btn"
            disabled={
              busy ||
              (state.courseForms.length === 0 && state.occurrences.length === 0)
            }
            onClick={onExportJson}
          >
            {t('exportJson')}
          </button>
        </div>
        <div className="url-row">
          <input
            type="url"
            placeholder={t('pasteUsosUrl')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
          />
          <button type="button" className="btn" disabled={busy || !url.trim()} onClick={() => void onUrlImport()}>
            {t('fetch')}
          </button>
        </div>
        {status?.kind === 'ok' && statusText && <p className="hint ok">{statusText}</p>}
        {status?.kind === 'err' && statusText && <p className="hint err">{statusText}</p>}
      </section>

      {selected && (
        <section className="panel-section course-detail">
          <h3>
            {selected.name}
            {selected.type ? ` · ${selected.type}` : ''}
          </h3>

          <label className="field">
            {t('shortName')}
            <input
              value={selected.shortName}
              onChange={(e) =>
                updateCourseForm(selected.id, { shortName: e.target.value })
              }
            />
          </label>

          <label className="field">
            {t('maxAbsences')}
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
            {t('notes')}
            <textarea
              rows={3}
              value={selected.notes}
              onChange={(e) =>
                updateCourseForm(selected.id, { notes: e.target.value })
              }
              placeholder={t('notesPlaceholder')}
            />
          </label>

          <div className="extra-dates">
            <div className="section-row">
              <h4>{t('extraDates')}</h4>
              <button type="button" className="btn" onClick={() => setAddOpen(true)}>
                {t('addDate')}
              </button>
            </div>
            <p className="hint">{t('extraDatesHint')}</p>

            {manualOccurrences.length === 0 ? (
              <p className="hint">{t('noExtraDates')}</p>
            ) : (
              <ul className="extra-date-list">
                {manualOccurrences.map((occ) => {
                  const start = parseISO(occ.start)
                  const end = parseISO(occ.end)
                  const label = `${format(start, 'd MMM yyyy', { locale: dateLocale })} · ${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`
                  return (
                    <li key={occ.id} className="extra-date-row">
                      <div className="extra-date-info">
                        <span className="extra-date-label">{label}</span>
                        <span className="extra-date-meta">
                          {occ.title}
                          {isExam(occ.id, occ.courseFormId) ? ` · ${t('exam')}` : ''}
                          {occ.location ? ` · ${occ.location}` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="absence-remove"
                        aria-label={t('removeDateAria', { date: label })}
                        title={t('removeDate')}
                        onClick={() => removeOccurrence(occ.id, selected.id)}
                      >
                        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M3.2 3.2a.75.75 0 0 1 1.06 0L8 6.94l3.74-3.74a.75.75 0 1 1 1.06 1.06L9.06 8l3.74 3.74a.75.75 0 1 1-1.06 1.06L8 9.06l-3.74 3.74a.75.75 0 1 1-1.06-1.06L6.94 8 3.2 4.26a.75.75 0 0 1 0-1.06Z"
                          />
                        </svg>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="absence-log">
            <h4>{t('absenceLog')}</h4>
            {selected.absences.length === 0 ? (
              <p className="hint">{t('noAbsences')}</p>
            ) : (
              <ul>
                {selected.absences
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((a) => {
                    const dateLabel = format(parseISO(a.date), 'd MMM yyyy', {
                      locale: dateLocale,
                    })
                    return (
                      <li key={a.id} className="absence-row">
                        <span>{dateLabel}</span>
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
                          <option value="absent">{t('count')}</option>
                          <option value="justified">{t('doesntCount')}</option>
                        </select>
                        <button
                          type="button"
                          className="absence-remove"
                          aria-label={t('removeAbsenceAria', { date: dateLabel })}
                          title={t('removeAbsence')}
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
                    )
                  })}
              </ul>
            )}
          </div>
        </section>
      )}

      <section className="panel-section">
        <div className="section-row">
          <h3>{t('courses')}</h3>
          <button type="button" className="btn danger ghost" onClick={() => void onClear()}>
            {t('clearData')}
          </button>
        </div>
        {state.courseForms.length === 0 ? (
          <p className="hint">{t('importToStart')}</p>
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

      {addOpen && selected && (
        <AddOccurrenceModal
          course={selected}
          onClose={() => setAddOpen(false)}
          onAdded={() => setStatus({ kind: 'ok', key: 'dateAdded' })}
        />
      )}
    </aside>
  )
}
