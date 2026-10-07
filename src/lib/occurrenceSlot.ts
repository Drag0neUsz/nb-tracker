export function parseOccurrenceSlot(
  date: string,
  startTime: string,
  endTime: string,
): { ok: true; start: string; end: string } | { ok: false } {
  const [y, m, d] = date.split('-').map(Number)
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  if ([y, m, d, startH, startM, endH, endM].some((n) => Number.isNaN(n))) {
    return { ok: false }
  }

  const startDate = new Date(y, m - 1, d, startH, startM)
  const endDate = new Date(y, m - 1, d, endH, endM)
  if (!(endDate.getTime() > startDate.getTime())) return { ok: false }

  return {
    ok: true,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  }
}

export function localDateFromIso(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function localTimeFromIso(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
