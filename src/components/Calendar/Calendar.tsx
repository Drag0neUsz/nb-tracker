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
import { tileColorFor, TILE_COLORS } from '../../lib/colors'
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

export function Calendar() {
  const { state, getCourse, isAbsent } = useAppStore()
  const [view, setView] = useState<CalendarView>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [activeOcc, setActiveOcc] = useState<Occurrence | null>(null)
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null)

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
    setActiveOcc(occ)
    setPopoverPos({
      x: Math.min(rect.left, window.innerWidth - 280),
      y: Math.min(rect.bottom + 6, window.innerHeight - 220),
    })
  }

  const title =
    view === 'week'
      ? `${format(days[0], 'd MMM')} – ${format(days[6], 'd MMM yyyy')}`
      : format(anchor, 'MMMM yyyy')

  return (
    <section className="calendar" onClick={() => setActiveOcc(null)}>
      <header className="calendar-toolbar">
        <div className="calendar-nav">
          <button type="button" className="btn ghost" onClick={goPrev} aria-label="Previous">
            ‹
          </button>
          <button type="button" className="btn ghost" onClick={goToday}>
            Today
          </button>
          <button type="button" className="btn ghost" onClick={goNext} aria-label="Next">
            ›
          </button>
          <h2 className="calendar-title">{title}</h2>
        </div>
        <div className="view-toggle" role="group" aria-label="Calendar view">
          <button
            type="button"
            className={view === 'week' ? 'btn toggle active' : 'btn toggle'}
            onClick={() => setView('week')}
          >
            Week
          </button>
          <button
            type="button"
            className={view === 'month' ? 'btn toggle active' : 'btn toggle'}
            onClick={() => setView('month')}
          >
            Month
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
                <span className="dow">{format(day, 'EEE')}</span>
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
                    return (
                      <button
                        key={occ.id}
                        type="button"
                        className={`week-tile${absent ? ' absent' : ''}`}
                        style={{
                          top,
                          height,
                          background: palette.bg,
                          borderColor: palette.border,
                          color: palette.text,
                        }}
                        onClick={(e) => openPopover(occ, e)}
                      >
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
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
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
                    return (
                      <button
                        key={occ.id}
                        type="button"
                        className={`month-chip${absent ? ' absent' : ''}`}
                        style={{
                          background: palette.bg,
                          borderColor: palette.border,
                          color: palette.text,
                        }}
                        title={`${occ.title} · ${format(parseISO(occ.start), 'HH:mm')}`}
                        onClick={(e) => openPopover(occ, e)}
                      >
                        {course?.shortName ?? course?.name?.slice(0, 6) ?? '•'}
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
          onClose={() => setActiveOcc(null)}
        />
      )}
    </section>
  )
}
