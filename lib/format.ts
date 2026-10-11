/**
 * Formateadores compartidos por la tienda publica y el panel.
 *
 * Se fija el locale y la zona horaria de forma explicita para que el render del
 * servidor y el del cliente produzcan el mismo texto; si se dejaran al ambiente,
 * Next avisaria de un desajuste de hidratacion.
 */

const priceFormatter = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
})

/** 89900 -> "$89.900" */
export function formatPrice(value: number): string {
  return `$${priceFormatter.format(value)}`
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "2026-02-12T10:00:00.000Z" -> "12 feb 2026" */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return dateFormatter.format(date).replace(/\./g, '')
}

/** 245760 -> "240 KB" */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
