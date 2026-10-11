/**
 * Fechas en hora de Colombia. La tienda vende en Colombia, asi que "hoy", "este
 * mes" y los cortes de las graficas se calculan en America/Bogota y no en UTC
 * (una venta a las 8 p. m. es de ese dia, no del siguiente). Colombia no tiene
 * horario de verano: el desfase es siempre UTC-5.
 */
const OFFSET_MS = 5 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** Instante -> "YYYY-MM-DD" en hora de Colombia. */
export function dayKey(date: Date): string {
  return new Date(date.getTime() - OFFSET_MS).toISOString().slice(0, 10)
}

/** Instante -> "YYYY-MM" en hora de Colombia. */
export function monthKey(date: Date): string {
  return dayKey(date).slice(0, 7)
}

/** "YYYY-MM-DD" -> instante en que empieza ese dia en Colombia. */
export function startOfDay(key: string): Date {
  return new Date(`${key}T00:00:00-05:00`)
}

export function addDays(key: string, days: number): string {
  return dayKey(new Date(startOfDay(key).getTime() + days * DAY_MS))
}

/** "YYYY-MM" desplazado `months` meses (negativo = hacia atras). */
export function addMonths(key: string, months: number): string {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + months, 1))
  return date.toISOString().slice(0, 7)
}

export function firstDayOfMonth(key: string): string {
  return `${key}-01`
}

export function lastDayOfMonth(key: string): string {
  return addDays(firstDayOfMonth(addMonths(key, 1)), -1)
}

/** Dias entre dos claves, ambas inclusive. */
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day)
  return days
}

export function isValidDayKey(value: string | null | undefined): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(startOfDay(value).getTime()) &&
    dayKey(startOfDay(value)) === value
  )
}
