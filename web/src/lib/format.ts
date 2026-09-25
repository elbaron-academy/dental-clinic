const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTimeFormat.format(new Date(iso)) : '—')
export const formatTime = (iso: string | null | undefined) => (iso ? timeFormat.format(new Date(iso)) : '—')
export const formatDate = (date: Date) => dateFormat.format(date)

/** Money is exchanged as decimal strings; display with two decimals. */
export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const number = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(number)) return String(value)
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Start and end (exclusive) of a local calendar day as ISO strings (CR-020). */
export function localDayRange(day: Date = new Date()): { from: string; to: string } {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
  return { from: start.toISOString(), to: end.toISOString() }
}

/** `YYYY-MM-DD` of a local date, for `<input type="date">`. */
export function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** `YYYY-MM-DDTHH:mm` in local time, for `<input type="datetime-local">`. */
export function toDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${toDateInput(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Converts a `datetime-local` value (local time) to an ISO timestamp. */
export function dateTimeInputToIso(value: string): string {
  return new Date(value).toISOString()
}

/** Next quarter hour from now, a sensible default for new appointments. */
export function nextQuarterHour(from: Date = new Date()): Date {
  const date = new Date(from)
  date.setSeconds(0, 0)
  date.setMinutes(Math.ceil((date.getMinutes() + 1) / 15) * 15)
  return date
}
