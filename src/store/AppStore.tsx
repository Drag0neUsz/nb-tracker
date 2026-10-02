import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Absence,
  AbsenceStatus,
  AppState,
  CourseForm,
  Occurrence,
  OccurrenceTag,
} from '../types'
import { EMPTY_STATE, createId } from '../types'
import { defaultStore, type DataStore } from './dataStore'
import { mergeIcsImport, type ParsedIcsImport } from '../lib/ics'
import {
  countUsedAbsences,
  getAbsenceForOccurrence,
  getOccurrenceNotes,
  getOverrides,
  isEmptyOverride,
  isExamOccurrence,
} from '../lib/attendance'

interface AppStoreValue {
  state: AppState
  ready: boolean
  selectedCourseId: string | null
  setSelectedCourseId: (id: string) => void
  importIcs: (parsed: ParsedIcsImport) => void
  clearAll: () => Promise<void>
  updateCourseForm: (id: string, patch: Partial<Pick<CourseForm, 'maxAbsences' | 'notes' | 'name' | 'shortName'>>) => void
  markAbsent: (occurrence: Occurrence) => void
  clearAbsence: (occurrenceId: string, courseFormId: string) => void
  setAbsenceStatus: (courseFormId: string, absenceId: string, status: AbsenceStatus) => void
  toggleExamTag: (occurrenceId: string, courseFormId: string) => void
  setOccurrenceNotes: (occurrenceId: string, courseFormId: string, notes: string) => void
  getOccurrenceNotes: (occurrenceId: string, courseFormId: string) => string
  getCourse: (id: string) => CourseForm | undefined
  remainingAbsences: (courseFormId: string) => number
  usedAbsences: (courseFormId: string) => number
  isAbsent: (occurrenceId: string, courseFormId: string) => boolean
  isExam: (occurrenceId: string, courseFormId: string) => boolean
}

const AppStoreContext = createContext<AppStoreValue | null>(null)

export function AppStoreProvider({
  children,
  store = defaultStore,
}: {
  children: ReactNode
  store?: DataStore
}) {
  const [state, setState] = useState<AppState>(EMPTY_STATE)
  const [ready, setReady] = useState(false)
  const [selectedCourseId, setSelectedCourseIdState] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    store.load().then((loaded) => {
      if (!cancelled) {
        setState(loaded)
        setReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [store])

  // Always keep a course selected when any exist (default: first).
  useEffect(() => {
    if (!ready) return
    const courses = state.courseForms
    if (courses.length === 0) {
      if (selectedCourseId !== null) setSelectedCourseIdState(null)
      return
    }
    const stillValid = courses.some((c) => c.id === selectedCourseId)
    if (!stillValid) setSelectedCourseIdState(courses[0].id)
  }, [ready, state.courseForms, selectedCourseId])

  const setSelectedCourseId = useCallback((id: string) => {
    setSelectedCourseIdState(id)
  }, [])

  const persist = useCallback(
    (next: AppState) => {
      setState(next)
      void store.save(next)
    },
    [store],
  )

  const importIcs = useCallback(
    (parsed: ParsedIcsImport) => {
      persist(mergeIcsImport(state, parsed))
    },
    [persist, state],
  )

  const clearAll = useCallback(async () => {
    await store.clear()
    setState({ ...EMPTY_STATE })
    setSelectedCourseIdState(null)
  }, [store])

  const updateCourseForm = useCallback(
    (
      id: string,
      patch: Partial<Pick<CourseForm, 'maxAbsences' | 'notes' | 'name' | 'shortName'>>,
    ) => {
      persist({
        ...state,
        courseForms: state.courseForms.map((c) =>
          c.id === id
            ? {
                ...c,
                ...patch,
                maxAbsences:
                  patch.maxAbsences !== undefined
                    ? Math.max(0, Math.floor(patch.maxAbsences))
                    : c.maxAbsences,
              }
            : c,
        ),
      })
    },
    [persist, state],
  )

  const markAbsent = useCallback(
    (occurrence: Occurrence) => {
      persist({
        ...state,
        courseForms: state.courseForms.map((c) => {
          if (c.id !== occurrence.courseFormId) return c
          if (getAbsenceForOccurrence(c, occurrence.id)) return c
          const absence: Absence = {
            id: createId(),
            occurrenceId: occurrence.id,
            date: occurrence.start.slice(0, 10),
            status: 'absent',
          }
          return { ...c, absences: [...c.absences, absence] }
        }),
      })
    },
    [persist, state],
  )

  const clearAbsence = useCallback(
    (occurrenceId: string, courseFormId: string) => {
      persist({
        ...state,
        courseForms: state.courseForms.map((c) =>
          c.id === courseFormId
            ? {
                ...c,
                absences: c.absences.filter((a) => a.occurrenceId !== occurrenceId),
              }
            : c,
        ),
      })
    },
    [persist, state],
  )

  const setAbsenceStatus = useCallback(
    (courseFormId: string, absenceId: string, status: AbsenceStatus) => {
      persist({
        ...state,
        courseForms: state.courseForms.map((c) =>
          c.id === courseFormId
            ? {
                ...c,
                absences: c.absences.map((a) =>
                  a.id === absenceId ? { ...a, status } : a,
                ),
              }
            : c,
        ),
      })
    },
    [persist, state],
  )

  const toggleExamTag = useCallback(
    (occurrenceId: string, courseFormId: string) => {
      persist({
        ...state,
        courseForms: state.courseForms.map((c) => {
          if (c.id !== courseFormId) return c
          const overrides = getOverrides(c, occurrenceId)
          const hasExam = overrides.tags.includes('exam')
          const nextTags: OccurrenceTag[] = hasExam
            ? overrides.tags.filter((t) => t !== 'exam')
            : [...overrides.tags, 'exam']
          const next = {
            occurrenceId,
            tags: nextTags,
            notes: overrides.notes ?? '',
          }

          const without = c.occurrenceOverrides.filter(
            (o) => o.occurrenceId !== occurrenceId,
          )
          if (isEmptyOverride(next)) {
            return { ...c, occurrenceOverrides: without }
          }
          return {
            ...c,
            occurrenceOverrides: [...without, next],
          }
        }),
      })
    },
    [persist, state],
  )

  const setOccurrenceNotes = useCallback(
    (occurrenceId: string, courseFormId: string, notes: string) => {
      persist({
        ...state,
        courseForms: state.courseForms.map((c) => {
          if (c.id !== courseFormId) return c
          const overrides = getOverrides(c, occurrenceId)
          const next = {
            occurrenceId,
            tags: overrides.tags,
            notes,
          }
          const without = c.occurrenceOverrides.filter(
            (o) => o.occurrenceId !== occurrenceId,
          )
          if (isEmptyOverride(next)) {
            return { ...c, occurrenceOverrides: without }
          }
          return {
            ...c,
            occurrenceOverrides: [...without, next],
          }
        }),
      })
    },
    [persist, state],
  )

  const readOccurrenceNotes = useCallback(
    (occurrenceId: string, courseFormId: string) => {
      const course = state.courseForms.find((c) => c.id === courseFormId)
      return course ? getOccurrenceNotes(course, occurrenceId) : ''
    },
    [state.courseForms],
  )

  const getCourse = useCallback(
    (id: string) => state.courseForms.find((c) => c.id === id),
    [state.courseForms],
  )

  const usedAbsences = useCallback(
    (courseFormId: string) => {
      const course = state.courseForms.find((c) => c.id === courseFormId)
      return course ? countUsedAbsences(course) : 0
    },
    [state.courseForms],
  )

  const remainingAbsences = useCallback(
    (courseFormId: string) => {
      const course = state.courseForms.find((c) => c.id === courseFormId)
      if (!course) return 0
      return Math.max(0, course.maxAbsences - countUsedAbsences(course))
    },
    [state.courseForms],
  )

  const isAbsent = useCallback(
    (occurrenceId: string, courseFormId: string) => {
      const course = state.courseForms.find((c) => c.id === courseFormId)
      return course ? Boolean(getAbsenceForOccurrence(course, occurrenceId)) : false
    },
    [state.courseForms],
  )

  const isExam = useCallback(
    (occurrenceId: string, courseFormId: string) => {
      const course = state.courseForms.find((c) => c.id === courseFormId)
      return course ? isExamOccurrence(course, occurrenceId) : false
    },
    [state.courseForms],
  )

  const value = useMemo<AppStoreValue>(
    () => ({
      state,
      ready,
      selectedCourseId,
      setSelectedCourseId,
      importIcs,
      clearAll,
      updateCourseForm,
      markAbsent,
      clearAbsence,
      setAbsenceStatus,
      toggleExamTag,
      setOccurrenceNotes,
      getOccurrenceNotes: readOccurrenceNotes,
      getCourse,
      remainingAbsences,
      usedAbsences,
      isAbsent,
      isExam,
    }),
    [
      state,
      ready,
      selectedCourseId,
      setSelectedCourseId,
      importIcs,
      clearAll,
      updateCourseForm,
      markAbsent,
      clearAbsence,
      setAbsenceStatus,
      toggleExamTag,
      setOccurrenceNotes,
      readOccurrenceNotes,
      getCourse,
      remainingAbsences,
      usedAbsences,
      isAbsent,
      isExam,
    ],
  )

  return (
    <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
  )
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
