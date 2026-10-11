/**
 * Los formateadores viven en lib/format.ts porque los comparten el panel y la
 * tienda publica. Este archivo se mantiene como reexportacion para no cambiar
 * los imports existentes del panel.
 */
export { formatPrice, formatDate, formatFileSize } from '@/lib/format'
