# NB Tracker

**Live app:** [https://nb-tracker-eight.vercel.app/](https://nb-tracker-eight.vercel.app/)

This is a **localStorage-based** version — everything runs in your browser, data never leaves your device, and it’s free to use (no account, no server, no fees).
(Tho obviously it won't sync between devices)

---

Track university class absences against per-course limits so you know what you can still skip. Built with Polish USOS timetables in mind (ICS import), with UI in **Polish** and **English**.

## Features

- **ICS import** — upload a `.ics` file or paste a USOS calendar URL; recurring events are expanded for the coming months
- **Week & month calendar** — color-coded tiles (remaining absences, limit used, exam, no limit), absence markers, notes, and over-limit warnings
- **Absence tracking** — mark/clear absences per class; per-course max limit with optional enforcement; justified absences that don’t count
- **Courses panel** — short names, notes, absence log, and manual extra dates (e.g. exams outside the USOS plan)
- **Backup** — export/import **ICS** or full-app **JSON** (selective merge on JSON import); clear all data anytime
- **Persistence** — state saved automatically in `localStorage` (`nb-tracker:v1`)

## Tech

React 19 · TypeScript · Vite · date-fns · ical.js

## Local development

```bash
npm install
npm run dev
```

| Script | Description |
| --- | --- |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve the production build |
| `npm run lint` | Oxlint |
