/**
 * Fechas de las promociones.
 *
 * DECISION: en la base de datos startsAt y endsAt son instantes (DateTime), y en
 * el formulario se eligen como fechas de calendario (<input type="date">). La
 * conversion se hace siempre contra un desplazamiento FIJO de la tienda, no
 * contra la zona del navegador.
 *
 * El motivo es evitar el error clasico de "la promocion empieza un dia antes":
 * si se usara la zona del navegador, un administrador conectado desde otro pais
 * guardaria un instante distinto para la misma fecha elegida. Colombia no tiene
 * horario de verano, asi que un desplazamiento fijo es exacto todo el ano.
 *
 * Una promocion del 1 al 5 de octubre se guarda como:
 *   startsAt = 01/10 00:00:00.000 -05:00
 *   endsAt   = 05/10 23:59:59.999 -05:00
 * y por tanto el dia 5 cuenta completo.
 */
const STORE_OFFSET_HOURS = -5

const OFFSET_LABEL = (() => {
  const sign = STORE_OFFSET_HOURS < 0 ? '-' : '+'
  const hours = String(Math.abs(STORE_OFFSET_HOURS)).padStart(2, '0')
  return `${sign}${hours}:00`
})()

const OFFSET_MS = STORE_OFFSET_HOURS * 60 * 60 * 1000

/** "2026-10-01" -> instante ISO del comienzo de ese dia en la tienda. */
export function startOfDayInstant(dateInput: string): string {
  return new Date(`${dateInput}T00:00:00.000${OFFSET_LABEL}`).toISOString()
}

/** "2026-10-05" -> instante ISO del final de ese dia en la tienda. */
export function endOfDayInstant(dateInput: string): string {
  return new Date(`${dateInput}T23:59:59.999${OFFSET_LABEL}`).toISOString()
}

/** Instante ISO -> "YYYY-MM-DD" en la zona de la tienda, para el <input>. */
export function toDateInputValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  // Se desplaza el instante y se lee la parte de fecha en UTC: asi se obtiene
  // el dia de calendario tal como lo ve la tienda.
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10)
}

/** Fecha de hoy en la zona de la tienda, para valores por defecto. */
export function todayInputValue(): string {
  return toDateInputValue(new Date().toISOString())
}

/** "2026-10-01" y "2026-10-05" -> "1 oct 2026 – 5 oct 2026" */
const rangeFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatDateRange(startIso: string, endIso: string): string {
  const start = toDateInputValue(startIso)
  const end = toDateInputValue(endIso)
  if (!start || !end) return '—'

  const fmt = (value: string) =>
    rangeFormatter.format(new Date(`${value}T12:00:00.000Z`)).replace(/\./g, '')

  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`
}
