# NB Tracker

**Live app:** [https://nb-tracker-eight.vercel.app/](https://nb-tracker-eight.vercel.app/)

This is a **localStorage-based** version — everything runs in your browser, data never leaves your device by default, and it’s free to use (no account, no server, no fees).
Optional **Google Drive sync** keeps the same JSON state in Drive’s hidden app-data folder so it can sync across devices.

---

Track university class absences against per-course limits so you know what you can still skip. Built with Polish USOS timetables in mind (ICS import), with UI in **Polish** and **English**.

## Features

- **ICS import** — upload a `.ics` file or paste a USOS calendar URL; recurring events are expanded for the coming months
- **Week & month calendar** — color-coded tiles (remaining absences, limit used, exam, no limit), absence markers, notes, and over-limit warnings
- **Absence tracking** — mark/clear absences per class; per-course max limit with optional enforcement; justified absences that don’t count
- **Courses panel** — short names, notes, absence log, and manual extra dates (e.g. exams outside the USOS plan)
- **Backup** — export/import **ICS** or full-app **JSON** (selective merge on JSON import); clear all data anytime
- **Persistence** — state saved automatically in `localStorage` (`nb-tracker:v1`)
- **Google Drive sync** (optional) — sign in with Google; app data syncs to Drive `appDataFolder` (not visible in the Drive UI)

## Tech

React 19 · TypeScript · Vite · date-fns · ical.js · Google Identity Services + Drive API

## Local development

```bash
npm install
cp .env.example .env.local   # optional, for Drive sync
npm run dev
```

| Script | Description |
| --- | --- |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve the production build |
| `npm run lint` | Oxlint |

### Google Drive sync setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Drive API**.
3. Create **OAuth 2.0 Client ID** → application type **Web application**.
4. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (Vite dev)
   - your production origin (e.g. `https://nb-tracker-eight.vercel.app`)
5. Copy the client ID into `.env.local`:

```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

6. Restart the dev server. The side panel will show **Sign in with Google**.

The app requests `drive.appdata` (hidden app folder) plus `userinfo.email` / `userinfo.profile` (to show who is signed in). Local data still works without signing in; sync uses last-write-wins by `updatedAt`.

If you signed in before those profile scopes were added, sign out (or revoke the app under [Google Account → Third-party access](https://myaccount.google.com/permissions)) and sign in again so Google re-prompts.
