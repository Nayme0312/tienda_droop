import { z } from 'zod'

/**
 * Reglas compartidas de los testimonios (tabla `testimonials`).
 *
 * Los usan la API (validacion real), el formulario del panel (limites de los
 * campos) y la tienda (fecha relativa, iniciales). No importa nada de servidor.
 */

export const TESTIMONIAL_NAME_MAX = 60
export const TESTIMONIAL_COMMENT_MIN = 10
export const TESTIMONIAL_COMMENT_MAX = 600
export const TESTIMONIAL_PRODUCT_MAX = 80
export const TESTIMONIAL_RATING_MIN = 1
export const TESTIMONIAL_RATING_MAX = 5

/** Cuantos testimonios activos carga como mucho la portada. */
export const STORE_TESTIMONIALS_LIMIT = 24

/**
 * Solo se aceptan fotos servidas por la propia tienda: las subidas desde el
 * panel (/api/uploads/...) y las estaticas de /images. Asi una URL externa no
 * puede usarse para rastrear a los visitantes ni cargar contenido ajeno.
 */
const AVATAR_PATTERN = /^\/(?:api\/uploads|images)\/[A-Za-z0-9_-]{1,128}\.[A-Za-z0-9]{2,5}$/

const nameField = z
  .string({ required_error: 'Escribe el nombre del cliente' })
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(TESTIMONIAL_NAME_MAX, `El nombre no puede superar los ${TESTIMONIAL_NAME_MAX} caracteres`)

const commentField = z
  .string({ required_error: 'Escribe el comentario' })
  .trim()
  .min(TESTIMONIAL_COMMENT_MIN, `El comentario debe tener al menos ${TESTIMONIAL_COMMENT_MIN} caracteres`)
  .max(
    TESTIMONIAL_COMMENT_MAX,
    `El comentario no puede superar los ${TESTIMONIAL_COMMENT_MAX} caracteres`,
  )

const ratingField = z
  .number({ required_error: 'Elige una calificacion', invalid_type_error: 'Calificacion no valida' })
  .int('Calificacion no valida')
  .min(TESTIMONIAL_RATING_MIN, 'La calificacion minima es 1 estrella')
  .max(TESTIMONIAL_RATING_MAX, 'La calificacion maxima es 5 estrellas')

/** Texto opcional: vacio se guarda como null. */
const productField = z
  .string()
  .trim()
  .max(TESTIMONIAL_PRODUCT_MAX, `El producto no puede superar los ${TESTIMONIAL_PRODUCT_MAX} caracteres`)
  .nullable()
  .transform((value) => (value ? value : null))

const avatarField = z
  .string()
  .trim()
  .nullable()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || AVATAR_PATTERN.test(value), {
    message: 'Foto no valida: subela desde el panel',
  })

/** Fecha ISO de la resena; no puede estar en el futuro (con 1 dia de margen por zonas horarias). */
const reviewedAtField = z
  .string({ invalid_type_error: 'Fecha no valida' })
  .datetime({ offset: true, message: 'Fecha no valida' })
  .transform((value) => new Date(value))
  .refine((date) => date.getTime() <= Date.now() + 24 * 60 * 60 * 1000, {
    message: 'La fecha no puede estar en el futuro',
  })
  .refine((date) => date.getUTCFullYear() >= 2000, { message: 'Fecha no valida' })

export const createTestimonialSchema = z
  .object({
    customerName: nameField,
    comment: commentField,
    rating: ratingField,
    productName: productField.default(null),
    avatarUrl: avatarField.default(null),
    isVerified: z.boolean().default(true),
    isActive: z.boolean().default(true),
    reviewedAt: reviewedAtField.optional(),
  })
  .strict('La peticion contiene campos no permitidos.')

export const updateTestimonialSchema = z
  .object({
    customerName: nameField.optional(),
    comment: commentField.optional(),
    rating: ratingField.optional(),
    productName: productField.optional(),
    avatarUrl: avatarField.optional(),
    isVerified: z.boolean().optional(),
    isActive: z.boolean().optional(),
    reviewedAt: reviewedAtField.optional(),
  })
  .strict('La peticion contiene campos no permitidos.')

/** Testimonio tal como lo ve la tienda publica (solo los activos). */
export interface PublicTestimonial {
  id: string
  customerName: string
  avatarUrl: string | null
  rating: number
  comment: string
  productName: string | null
  isVerified: boolean
  /** ISO 8601. */
  reviewedAt: string
}

/** "Sofia Ramirez" -> "SR"; "carlos" -> "C". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts
  return (
    letters
      .map((part) => part.replace(/[^\p{L}\p{N}]/gu, '').charAt(0))
      .join('')
      .toUpperCase() || '?'
  )
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'always' })

/** Fecha relativa en espanol: "hace 1 mes", "hace 3 dias", "hace un momento". */
export function formatRelativeDate(value: string | Date, now: Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)
  if (!Number.isFinite(seconds) || seconds < 60) return 'hace un momento'

  for (const [unit, size] of RELATIVE_UNITS) {
    if (seconds >= size) {
      return relativeFormatter.format(-Math.floor(seconds / size), unit)
    }
  }
  return 'hace un momento'
}
