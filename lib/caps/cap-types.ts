import { z } from 'zod'

/**
 * Reglas compartidas de los tipos de gorra (tabla `cap_types`).
 *
 * Los tipos viven en PostgreSQL y se administran desde el panel; aqui solo
 * estan las reglas que comparten la API, el panel y la tienda. No importa nada
 * de servidor.
 */

/** Seccion de tienda a la que aplican los tipos de gorra. */
export const CAP_SECTION_SLUG = 'gorras'

export function isCapSection(slug: string): boolean {
  return slug === CAP_SECTION_SLUG
}

export const CAP_TYPE_NAME_MAX = 40

/** "Cerrada Premium" -> "cerrada-premium" */
export function slugifyCapType(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, CAP_TYPE_NAME_MAX)
    .replace(/-+$/g, '')
}

const nameField = z
  .string({ required_error: 'Escribe el nombre del tipo' })
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(CAP_TYPE_NAME_MAX, `El nombre no puede superar los ${CAP_TYPE_NAME_MAX} caracteres`)
  .refine((value) => slugifyCapType(value) !== '', {
    message: 'El nombre debe tener letras o numeros',
  })

export const createCapTypeSchema = z.object({
  name: nameField,
  isActive: z.boolean().default(true),
  usesFittedSizes: z.boolean().default(false),
})

export const updateCapTypeSchema = z.object({
  name: nameField.optional(),
  isActive: z.boolean().optional(),
  usesFittedSizes: z.boolean().optional(),
})

/** Tipo de gorra tal como lo ve la tienda publica (solo los activos). */
export interface PublicCapType {
  slug: string
  name: string
  /** Se vende por talla cerrada: activa la Guia de tallas. */
  usesFittedSizes: boolean
}
