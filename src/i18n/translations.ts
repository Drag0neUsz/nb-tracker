export type Locale = 'pl' | 'en'

export const DEFAULT_LOCALE: Locale = 'pl'

export const translations = {
  pl: {
    loading: 'Ładowanie trackera…',
    language: 'Język',
    langPl: 'PL',
    langEn: 'EN',

    brand: 'NB Tracker',
    tagline: 'Śledź nieobecności bez zgadywania.',

    importCalendar: 'Dane',
    uploadIcs: 'Wgraj .ics',
    exportIcs: 'Eksportuj .ics',
    uploadJson: 'Wgraj .json',
    exportJson: 'Eksportuj .json',
    exported: 'Wyeksportowano {classes} zajęć do pliku .ics.',
    exportedJson: 'Wyeksportowano dane aplikacji do pliku .json.',
    importedJson: 'Zaimportowano dane z pliku .json ({courses} przedmiot(ów), {classes} zajęć).',
    jsonInvalid: 'Nieprawidłowy plik .json aplikacji.',
    jsonImportConfirm:
      'Import .json zastąpi wszystkie obecne dane (nieobecności, egzaminy, notatki). Kontynuować?',
    nothingToExport: 'Brak danych do eksportu.',
    working: 'Pracuję…',
    pasteUsosUrl: 'Wklej URL .ics z USOS',
    fetch: 'Pobierz',
    imported: 'Zaimportowano {courses} przedmiot(ów), {classes} zajęć.',
    failedImportFile: 'Nie udało się zaimportować pliku.',
    failedImportUrl: 'Nie udało się zaimportować z URL.',
    icsCors:
      'Nie udało się pobrać kalendarza z URL (prawdopodobnie CORS). Pobierz plik .ics i wgraj go ręcznie.',
    icsDownloadFailed:
      'Pobieranie nie powiodło się ({status}). Spróbuj wgrać plik .ics.',
    icsInvalid:
      'URL nie zwrócił poprawnego kalendarza ICS. Spróbuj wgrać plik.',
    clearConfirm:
      'Wyczyścić wszystkie zapisane przedmioty, nieobecności i dane kalendarza?',
    cleared: 'Wszystkie zapisane dane zostały wyczyszczone.',

    shortName: 'Skrót',
    maxAbsences: 'Limit nieobecności',
    notes: 'Notatki',
    notesPlaceholder: 'Sale, zasady odrabiania…',
    absenceLog: 'Dziennik nieobecności',
    noAbsences: 'Brak oznaczonych nieobecności.',
    count: 'Liczy się',
    doesntCount: 'Nie liczy się',
    removeAbsence: 'Usuń nieobecność',
    removeAbsenceAria: 'Usuń nieobecność z dnia {date}',

    extraDates: 'Dodatkowe terminy',
    extraDatesHint: 'Np. egzamin w sesji poza planem USOS.',
    date: 'Data',
    startTime: 'Od',
    endTime: 'Do',
    location: 'Sala / lokalizacja',
    locationPlaceholder: 'opcjonalnie',
    titleOptional: 'Tytuł',
    titlePlaceholder: 'np. Egzamin, poprawka…',
    markAsExam: 'Oznacz jako egzamin',
    addDate: 'Dodaj termin',
    saveDate: 'Zapisz termin',
    cancel: 'Anuluj',
    noExtraDates: 'Brak ręcznie dodanych terminów.',
    removeDate: 'Usuń termin',
    removeDateAria: 'Usuń termin {date}',
    invalidDateRange: 'Godzina zakończenia musi być późniejsza niż rozpoczęcia.',
    dateAdded: 'Dodano termin.',

    courses: 'Przedmioty',
    clearData: 'Wyczyść dane',
    importToStart: 'Zaimportuj kalendarz USOS, aby zacząć.',

    today: 'Dziś',
    previous: 'Poprzedni',
    next: 'Następny',
    calendarView: 'Widok kalendarza',
    week: 'Tydzień',
    month: 'Miesiąc',
    colorLegend: 'Legenda kolorów',
    canSkip: 'Można opuścić',
    capUsed: 'Limit wyczerpany',
    exam: 'Egzamin',
    hasNotes: 'ma notatki',
    overAbsenceLimit: 'przekroczony limit nieobecności',
    weekdaysShort: ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'],

    classActions: 'Akcje zajęć',
    absencesStat: 'Nieobecności: {used}/{max} (zostało {left})',
    occNotesPlaceholder: 'Zadania, przygotowanie, przypomnienia…',
    clearAbsence: 'Usuń nieobecność',
    markAbsent: 'Oznacz nieobecność',
    unmarkExam: 'Odznacz egzamin',
    tagAsExam: 'Oznacz jako egzamin',
    openCourse: 'Otwórz przedmiot',
  },
  en: {
    loading: 'Loading tracker…',
    language: 'Language',
    langPl: 'PL',
    langEn: 'EN',

    brand: 'NB Tracker',
    tagline: 'Track skippable classes without guessing.',

    importCalendar: 'Data',
    uploadIcs: 'Upload .ics',
    exportIcs: 'Export .ics',
    uploadJson: 'Upload .json',
    exportJson: 'Export .json',
    exported: 'Exported {classes} class(es) to an .ics file.',
    exportedJson: 'Exported app data to a .json file.',
    importedJson: 'Imported app data from .json ({courses} course(s), {classes} class(es)).',
    jsonInvalid: 'Invalid NB Tracker .json file.',
    jsonImportConfirm:
      'Importing .json will replace all current data (absences, exams, notes). Continue?',
    nothingToExport: 'Nothing to export.',
    working: 'Working…',
    pasteUsosUrl: 'Paste USOS .ics URL',
    fetch: 'Fetch',
    imported: 'Imported {courses} course form(s), {classes} class(es).',
    failedImportFile: 'Failed to import file.',
    failedImportUrl: 'Failed to import from URL.',
    icsCors:
      'Could not download the calendar URL (likely blocked by CORS). Download the .ics file and upload it instead.',
    icsDownloadFailed:
      'Download failed ({status}). Try uploading the .ics file instead.',
    icsInvalid:
      'URL did not return a valid ICS calendar. Try uploading the file instead.',
    clearConfirm:
      'Clear all saved courses, absences, and calendar data?',
    cleared: 'All saved data cleared.',

    shortName: 'Short name',
    maxAbsences: 'Max absences',
    notes: 'Notes',
    notesPlaceholder: 'Room quirks, makeup rules…',
    absenceLog: 'Absence log',
    noAbsences: 'No absences marked yet.',
    count: 'Count',
    doesntCount: "Doesn't count",
    removeAbsence: 'Remove absence',
    removeAbsenceAria: 'Remove absence on {date}',

    extraDates: 'Extra dates',
    extraDatesHint: 'E.g. an exam during finals week outside the USOS plan.',
    date: 'Date',
    startTime: 'From',
    endTime: 'To',
    location: 'Room / location',
    locationPlaceholder: 'optional',
    titleOptional: 'Title',
    titlePlaceholder: 'e.g. Exam, resit…',
    markAsExam: 'Mark as exam',
    addDate: 'Add date',
    saveDate: 'Save date',
    cancel: 'Cancel',
    noExtraDates: 'No manually added dates yet.',
    removeDate: 'Remove date',
    removeDateAria: 'Remove date {date}',
    invalidDateRange: 'End time must be after start time.',
    dateAdded: 'Date added.',

    courses: 'Courses',
    clearData: 'Clear data',
    importToStart: 'Import a USOS calendar to get started.',

    today: 'Today',
    previous: 'Previous',
    next: 'Next',
    calendarView: 'Calendar view',
    week: 'Week',
    month: 'Month',
    colorLegend: 'Color legend',
    canSkip: 'Can skip',
    capUsed: 'Cap used',
    exam: 'Exam',
    hasNotes: 'has notes',
    overAbsenceLimit: 'over absence limit',
    weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],

    classActions: 'Class actions',
    absencesStat: 'Absences: {used}/{max} ({left} left)',
    occNotesPlaceholder: 'Homework due, prep, reminders…',
    clearAbsence: 'Clear absence',
    markAbsent: 'Mark absent',
    unmarkExam: 'Unmark exam',
    tagAsExam: 'Tag as exam',
    openCourse: 'Open course',
  },
} as const

export type TranslationKey = Exclude<
  keyof (typeof translations)['en'],
  'weekdaysShort'
>

export type MessageParams = Record<string, string | number>

export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: MessageParams,
): string {
  const template = translations[locale][key] as string
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`,
  )
}
