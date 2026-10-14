import type { AppState } from '../types'
import { BACKUP_FORMAT, normalizeAppState } from './jsonBackup'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const FILE_NAME = 'nb-tracker-state.json'

export interface DriveSnapshot {
  state: AppState
  updatedAt: string
  fileId: string
}

interface DriveFileList {
  files?: Array<{ id: string; name: string; modifiedTime?: string }>
}

interface DrivePayload {
  format: typeof BACKUP_FORMAT
  version: 1
  updatedAt: string
  courseForms: AppState['courseForms']
  occurrences: AppState['occurrences']
}

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` }
}

async function driveFetch(
  accessToken: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(accessToken),
      ...(init?.headers ?? {}),
    },
  })
  return res
}

async function findAppDataFile(accessToken: string): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    fields: 'files(id,name,modifiedTime)',
    q: `name='${FILE_NAME}'`,
    pageSize: '10',
  })
  const res = await driveFetch(accessToken, `${DRIVE_API}/files?${params}`)
  if (!res.ok) {
    throw new Error(`Drive list failed (${res.status})`)
  }
  const data = (await res.json()) as DriveFileList
  return data.files?.[0]?.id ?? null
}

function toPayload(state: AppState, updatedAt: string): DrivePayload {
  return {
    format: BACKUP_FORMAT,
    version: 1,
    updatedAt,
    courseForms: state.courseForms,
    occurrences: state.occurrences,
  }
}

function parsePayload(raw: unknown): { state: AppState; updatedAt: string } | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const state = normalizeAppState(raw)
  if (!state) return null
  const updatedAt =
    typeof obj.updatedAt === 'string'
      ? obj.updatedAt
      : typeof obj.exportedAt === 'string'
        ? obj.exportedAt
        : new Date(0).toISOString()
  return { state, updatedAt }
}

export async function loadFromDrive(accessToken: string): Promise<DriveSnapshot | null> {
  const fileId = await findAppDataFile(accessToken)
  if (!fileId) return null

  const res = await driveFetch(
    accessToken,
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`,
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Drive download failed (${res.status})`)

  const raw: unknown = await res.json()
  const parsed = parsePayload(raw)
  if (!parsed) throw new Error('Drive file is not a valid NB Tracker backup')
  return { ...parsed, fileId }
}

export async function saveToDrive(
  accessToken: string,
  state: AppState,
  existingFileId?: string | null,
): Promise<DriveSnapshot> {
  const updatedAt = new Date().toISOString()
  const body = JSON.stringify(toPayload(state, updatedAt))
  let fileId = existingFileId ?? (await findAppDataFile(accessToken))

  if (fileId) {
    const res = await driveFetch(
      accessToken,
      `${UPLOAD_API}/files/${encodeURIComponent(fileId)}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body,
      },
    )
    if (!res.ok) throw new Error(`Drive update failed (${res.status})`)
  } else {
    const metadata = JSON.stringify({
      name: FILE_NAME,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
    })
    const boundary = 'nb_tracker_boundary'
    const multipart =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      `${body}\r\n` +
      `--${boundary}--`

    const res = await driveFetch(
      accessToken,
      `${UPLOAD_API}/files?uploadType=multipart&fields=id`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipart,
      },
    )
    if (!res.ok) throw new Error(`Drive create failed (${res.status})`)
    const created = (await res.json()) as { id: string }
    fileId = created.id
  }

  return { state, updatedAt, fileId }
}

export async function clearDriveData(
  accessToken: string,
  fileId?: string | null,
): Promise<void> {
  const id = fileId ?? (await findAppDataFile(accessToken))
  if (!id) return
  const res = await driveFetch(
    accessToken,
    `${DRIVE_API}/files/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
  if (!res.ok && res.status !== 404) {
    throw new Error(`Drive delete failed (${res.status})`)
  }
}

/** Prefer newer snapshot; if equal timestamps, prefer remote. */
export function pickNewerState(
  local: { state: AppState; updatedAt: string | null },
  remote: DriveSnapshot | null,
): { state: AppState; source: 'local' | 'remote' | 'empty' } {
  const localEmpty =
    local.state.courseForms.length === 0 && local.state.occurrences.length === 0
  const remoteEmpty =
    !remote ||
    (remote.state.courseForms.length === 0 && remote.state.occurrences.length === 0)

  if (localEmpty && remoteEmpty) return { state: local.state, source: 'empty' }
  if (localEmpty && remote) return { state: remote.state, source: 'remote' }
  if (remoteEmpty) return { state: local.state, source: 'local' }

  const localTs = local.updatedAt ? Date.parse(local.updatedAt) : 0
  const remoteTs = remote ? Date.parse(remote.updatedAt) : 0
  if (remoteTs >= localTs && remote) {
    return { state: remote.state, source: 'remote' }
  }
  return { state: local.state, source: 'local' }
}
