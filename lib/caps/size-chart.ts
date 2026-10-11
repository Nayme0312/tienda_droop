/**
 * Tablas de tallas de gorras cerradas (fitted).
 *
 * La talla de una gorra cerrada no es una medida fija: cada talla cubre un
 * rango de contorno de cabeza, y ese rango puede variar entre marcas. Por eso
 * la conversion no esta escrita en el componente sino en tablas de datos: para
 * una marca con otra horma basta con anadir aqui su tabla y pasarla a la
 * calculadora (components/cap-size-calculator.tsx).
 *
 * Cada fila dice hasta que contorno (en cm, inclusive) sirve esa talla. Una
 * cabeza que cae entre dos tallas recibe la MAYOR: una gorra cerrada un poco
 * holgada se usa sin problema, una apretada no.
 */

export interface CapSize {
  /** Talla tal como se marca en la gorra: "7 1/4". */
  label: string
  /** Contorno maximo de cabeza (cm, inclusive) para esta talla. */
  maxCm: number
}

export interface CapSizeChart {
  id: string
  name: string
  /** Contorno minimo (cm) a partir del cual la tabla tiene talla. */
  minCm: number
  /** Ordenadas de menor a mayor. */
  sizes: CapSize[]
}

/**
 * Tabla estandar de gorras cerradas. La talla es el diametro de la cabeza en
 * pulgadas, asi que cada contorno es talla x pi x 2,54 cm (7 1/4 -> ~57,7 cm),
 * con los valores de las tablas publicadas por los fabricantes.
 */
export const STANDARD_FITTED_CHART: CapSizeChart = {
  id: 'estandar',
  name: 'Estandar gorra cerrada',
  minCm: 52.9,
  sizes: [
    { label: '6 3/4', maxCm: 53.9 },
    { label: '6 7/8', maxCm: 54.9 },
    { label: '7', maxCm: 55.8 },
    { label: '7 1/8', maxCm: 56.8 },
    { label: '7 1/4', maxCm: 57.7 },
    { label: '7 3/8', maxCm: 58.7 },
    { label: '7 1/2', maxCm: 59.6 },
    { label: '7 5/8', maxCm: 60.6 },
    { label: '7 3/4', maxCm: 61.5 },
    { label: '7 7/8', maxCm: 62.5 },
    { label: '8', maxCm: 63.5 },
  ],
}

/** Tablas disponibles por id. Aqui se anadiran las de otras marcas. */
export const CAP_SIZE_CHARTS: Record<string, CapSizeChart> = {
  [STANDARD_FITTED_CHART.id]: STANDARD_FITTED_CHART,
}

/** Medidas que la calculadora acepta como contorno de cabeza real. */
export const HEAD_CM_MIN = 40
export const HEAD_CM_MAX = 75

export type CapSizeResult =
  | {
      kind: 'match'
      size: CapSize
      /** Rango de contorno que cubre la talla: (fromCm, toCm]. */
      fromCm: number
      toCm: number
    }
  | { kind: 'below'; smallest: CapSize }
  | { kind: 'above'; largest: CapSize }

/** Talla de la tabla para un contorno de cabeza en cm. */
export function findCapSize(cm: number, chart: CapSizeChart): CapSizeResult {
  const { sizes } = chart
  if (cm <= chart.minCm) return { kind: 'below', smallest: sizes[0] }

  for (let i = 0; i < sizes.length; i++) {
    if (cm <= sizes[i].maxCm) {
      return {
        kind: 'match',
        size: sizes[i],
        fromCm: i === 0 ? chart.minCm : sizes[i - 1].maxCm,
        toCm: sizes[i].maxCm,
      }
    }
  }
  return { kind: 'above', largest: sizes[sizes.length - 1] }
}

/** "57,5" o "57.5" -> 57.5; null si no es un numero. */
export function parseCm(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  return Number(normalized)
}

/** 57.7 -> "57,7" (formato colombiano). */
export function formatCm(value: number): string {
  return value.toLocaleString('es-CO', { maximumFractionDigits: 1 })
}

const UNICODE_FRACTIONS: Record<string, string> = {
  '¼': '1/4',
  '½': '1/2',
  '¾': '3/4',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
}

/**
 * Forma canonica de una talla de gorra, para comparar la talla calculada con
 * las que se escribieron en el producto: "7-1/4", "7 ¼" y " 7  1/4" -> "7 1/4".
 */
export function normalizeCapSize(value: string): string {
  return value
    .replace(/[¼½¾⅛⅜⅝⅞]/g, (f) => ` ${UNICODE_FRACTIONS[f]}`)
    .replace(/(\d)\s*-\s*(\d+\/\d+)/g, '$1 $2')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
}

/** true si la talla esta en la tabla (tras normalizarla). */
export function isChartSize(value: string, chart: CapSizeChart): boolean {
  const normalized = normalizeCapSize(value)
  return chart.sizes.some((size) => size.label === normalized)
}

/** true si alguna de las tallas del producto es `label`. */
export function hasCapSize(sizes: string[], label: string): boolean {
  return sizes.some((size) => normalizeCapSize(size) === label)
}

export type HeadMeasure =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'measured'; cm: number; result: CapSizeResult }

/** Lo que el cliente escribio en la calculadora, ya interpretado. */
export function resolveHeadMeasure(
  value: string,
  chart: CapSizeChart,
): HeadMeasure {
  if (value.trim() === '') return { kind: 'empty' }
  const cm = parseCm(value)
  if (cm === null || cm < HEAD_CM_MIN || cm > HEAD_CM_MAX) {
    return { kind: 'invalid' }
  }
  return { kind: 'measured', cm, result: findCapSize(cm, chart) }
}
