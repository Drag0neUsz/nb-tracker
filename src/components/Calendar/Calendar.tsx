import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'
import { useMemo, useState, type MouseEvent } from 'react'
import type { CalendarView, Occurrence } from '../../types'
import { useAppStore } from '../../store/AppStore'
import { useLanguage } from '../../i18n/LanguageContext'
import { tileColorFor, TILE_COLORS } from '../../lib/colors'
import { isOverAbsenceLimit } from '../../lib/attendance'
import { OccurrencePopover } from './OccurrencePopover'
import './Calendar.css'

const WEEK_STARTS_ON = 1 as const // Monday
const DAY_START_HOUR = 7
const DAY_END_HOUR = 21
const HOUR_HEIGHT = 56

function weekDays(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON })
  return eachDayOfInterval({ start, end: addDays(start, 6) })
}

function monthDays(anchor: Date) {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: WEEK_STARTS_ON })
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: WEEK_STARTS_ON })
  return eachDayOfInterval({ start, end })
}

function minutesSinceDayStart(date: Date) {
  return (date.getHours() - DAY_START_HOUR) * 60 + date.getMinutes()
}

function NotesIcon() {
  return (
    <svg
      className="tile-notes-icon"
      viewBox="0 0 16 16"
      width="12"
      height="12"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M3.5 1.5h7.2L14 4.8V13a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13V3a1.5 1.5 0 0 1 1.5-1.5Zm6.7.9v2.1h2.1L10.2 2.4ZM4.25 7h7.5v1.1h-7.5V7Zm0 2.4h7.5v1.1h-7.5V9.4Zm0 2.4h5v1.1h-5v-1.1Z"
      />
    </svg>
  )
}

function WarningIcon({ className = 'tile-warning-icon' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="12"
      height="12"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M8.85 1.7a1 1 0 0 0-1.7 0L1.2 12.2A1 1 0 0 0 2.05 13.7h11.9a1 1 0 0 0 .85-1.5L8.85 1.7ZM8 5.4c.35 0 .62.28.6.63l-.2 3.4a.4.4 0 0 1-.8 0l-.2-3.4A.61.61 0 0 1 8 5.4Zm0 6.45a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
      />
    </svg>
  )
}

export function Calendar() {
  const { state, getCourse, isAbsent, setSelectedCourseId, getOccurrenceNotes } = useAppStore()
  const { t, dateLocale, weekdaysShort } = useLanguage()
  const [view, setView] = useState<CalendarView>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [activeOcc, setActiveOcc] = useState<Occurrence | null>(null)
  const [popoverPos, setPopoverPos] = useState<{
    x: number
    y: number
    anchorTop: number
  } | null>(null)

  const hours = useMemo(
    () => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i),
    [],
  )

  const days = view === 'week' ? weekDays(anchor) : monthDays(anchor)

  const occurrencesInRange = useMemo(() => {
    const start = days[0]
    const end = addDays(days[days.length - 1], 1)
    return state.occurrences
      .filter((o) => {
        const s = parseISO(o.start)
        return s >= start && s < end
      })
      .sort((a, b) => a.start.localeCompare(b.start))
  }, [days, state.occurrences])

  const goPrev = () =>
    setAnchor((d) => (view === 'week' ? subWeeks(d, 1) : subMonths(d, 1)))
  const goNext = () =>
    setAnchor((d) => (view === 'week' ? addWeeks(d, 1) : addMonths(d, 1)))
  const goToday = () => setAnchor(new Date())

  const openPopover = (occ: Occurrence, e: MouseEvent) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setSelectedCourseId(occ.courseFormId)
    setActiveOcc(occ)
    setPopoverPos({
      x: Math.max(12, Math.min(rect.left, window.innerWidth - 312)),
      y: rect.bottom + 6,
      anchorTop: rect.top,
    })
  }

  const title =
    view === 'week'
      ? `${format(days[0], 'd MMM', { locale: dateLocale })} – ${format(days[6], 'd MMM yyyy', { locale: dateLocale })}`
      : format(anchor, 'LLLL yyyy', { locale: dateLocale })

  return (
    <section className="calendar" onClick={() => setActiveOcc(null)}>
      <header className="calendar-toolbar">
        <div className="calendar-nav">
          <button type="button" className="btn ghost" onClick={goPrev} aria-label={t('previous')}>
            ‹
          </button>
          <button type="button" className="btn ghost" onClick={goToday}>
            {t('today')}
          </button>
          <button type="button" className="btn ghost" onClick={goNext} aria-label={t('next')}>
            ›
          </button>
          <h2 className="calendar-title">{title}</h2>
        </div>
        <div className="view-toggle" role="group" aria-label={t('calendarView')}>
          <button
            type="button"
            className={view === 'week' ? 'btn toggle active' : 'btn toggle'}
            onClick={() => setView('week')}
          >
            {t('week')}
          </button>
          <button
            type="button"
            className={view === 'month' ? 'btn toggle active' : 'btn toggle'}
            onClick={() => setView('month')}
          >
            {t('month')}
          </button>
        </div>
      </header>

      {view === 'week' ? (
        <div className="week-grid">
          <div className="week-header">
            <div className="time-gutter" />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={`week-day-head${isToday(day) ? ' today' : ''}`}
              >
                <span className="dow">{format(day, 'EEE', { locale: dateLocale })}</span>
                <span className="dom">{format(day, 'd')}</span>
              </div>
            ))}
          </div>
          <div
            className="week-body"
            style={{ height: (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT }}
          >
            <div className="time-gutter">
              {hours.map((h) => (
                <div key={h} className="hour-label" style={{ height: HOUR_HEIGHT }}>
                  {`${String(h).padStart(2, '0')}:00`}
                </div>
              ))}
            </div>
            {days.map((day) => {
              const dayOccs = occurrencesInRange.filter((o) =>
                isSameDay(parseISO(o.start), day),
              )
              return (
                <div key={day.toISOString()} className="week-day-col">
                  {hours.map((h) => (
                    <div key={h} className="hour-line" style={{ height: HOUR_HEIGHT }} />
                  ))}
                  {dayOccs.map((occ) => {
                    const course = getCourse(occ.courseFormId)
                    const color = tileColorFor(course, occ.id)
                    const palette = TILE_COLORS[color]
                    const start = parseISO(occ.start)
                    const end = parseISO(occ.end)
                    const top =
                      (Math.max(0, minutesSinceDayStart(start)) / 60) * HOUR_HEIGHT
                    const durationMin = Math.max(
                      30,
                      (end.getTime() - start.getTime()) / 60000,
                    )
                    const height = (durationMin / 60) * HOUR_HEIGHT
                    const absent = isAbsent(occ.id, occ.courseFormId)
                    const hasNotes = getOccurrenceNotes(occ.id, occ.courseFormId).trim().length > 0
                    const overLimit = course ? isOverAbsenceLimit(course) : false
                    return (
                      <button
                        key={occ.id}
                        type="button"
                        className={`week-tile${absent ? ' absent' : ''}${hasNotes ? ' has-notes' : ''}${overLimit ? ' over-limit' : ''}`}
                        style={{
                          top,
                          height,
                          background: palette.bg,
                          borderColor: palette.border,
                          color: palette.text,
                        }}
                        onClick={(e) => openPopover(occ, e)}
                      >
                        {overLimit && <WarningIcon />}
                        {hasNotes && <NotesIcon />}
                        <span className="tile-title">
                          {course?.shortName ?? course?.name ?? occ.title}
                        </span>
                        <span className="tile-time">
                          {format(start, 'HH:mm')}–{format(end, 'HH:mm')}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="month-grid">
          {weekdaysShort.map((d) => (
            <div key={d} className="month-dow">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const dayOccs = occurrencesInRange.filter((o) =>
              isSameDay(parseISO(o.start), day),
            )
            return (
              <div
                key={day.toISOString()}
                className={`month-cell${!isSameMonth(day, anchor) ? ' muted' : ''}${isToday(day) ? ' today' : ''}`}
              >
                <span className="month-date">{format(day, 'd')}</span>
                <div className="month-chips">
                  {dayOccs.map((occ) => {
                    const course = getCourse(occ.courseFormId)
                    const color = tileColorFor(course, occ.id)
                    const palette = TILE_COLORS[color]
                    const absent = isAbsent(occ.id, occ.courseFormId)
                    const hasNotes = getOccurrenceNotes(occ.id, occ.courseFormId).trim().length > 0
                    const overLimit = course ? isOverAbsenceLimit(course) : false
                    const titleParts = [
                      occ.title,
                      format(parseISO(occ.start), 'HH:mm'),
                      hasNotes ? t('hasNotes') : null,
                      overLimit ? t('overAbsenceLimit') : null,
                    ].filter(Boolean)
                    return (
                      <button
                        key={occ.id}
                        type="button"
                        className={`month-chip${absent ? ' absent' : ''}${hasNotes ? ' has-notes' : ''}${overLimit ? ' over-limit' : ''}`}
                        style={{
                          background: palette.bg,
                          borderColor: palette.border,
                          color: palette.text,
                        }}
                        title={titleParts.join(' · ')}
                        onClick={(e) => openPopover(occ, e)}
                      >
                        {overLimit && <WarningIcon />}
                        {course?.shortName ?? course?.name?.slice(0, 6) ?? '•'}
                        {hasNotes && <NotesIcon />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeOcc && popoverPos && (
        <OccurrencePopover
          occurrence={activeOcc}
          x={popoverPos.x}
          y={popoverPos.y}
          anchorTop={popoverPos.anchorTop}
          onClose={() => setActiveOcc(null)}
          onOccurrenceChange={setActiveOcc}
        />
      )}

      <div className="calendar-legend" aria-label={t('colorLegend')}>
        <span><i className="swatch green" /> {t('canSkip')}</span>
        <span><i className="swatch orange" /> {t('capUsed')}</span>
        <span><i className="swatch red" /> {t('exam')}</span>
      </div>
    </section>
  )
}
