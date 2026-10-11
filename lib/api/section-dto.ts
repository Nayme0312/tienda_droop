import { Prisma, ProductStatus as DbProductStatus } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import type { AdminStoreSection } from '@/lib/admin/types'
import { isBuiltInSection, sectionSlugError } from '@/lib/sections'

/** Campos que necesita el DTO de una seccion. */
export const sectionSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  isVisible: true,
  _count: { select: { products: true } },
} satisfies Prisma.CategorySelect

type SectionRow = Prisma.CategoryGetPayload<{ select: typeof sectionSelect }>

/** Fila de la base de datos -> lo que consume el panel. */
export function toAdminSection(
  row: SectionRow,
  activeProductCount: number,
): AdminStoreSection {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isVisible: row.isVisible,
    isBuiltIn: isBuiltInSection(row.slug),
    productCount: row._count.products,
    activeProductCount,
  }
}

/** Una seccion ya leida, con su recuento de productos activos. */
export async function loadAdminSection(
  slug: string,
): Promise<AdminStoreSection | null> {
  const row = await prisma.category.findUnique({
    where: { slug },
    select: sectionSelect,
  })
  if (!row) return null
  const active = await prisma.product.count({
    where: { categoryId: row.id, status: DbProductStatus.ACTIVE },
  })
  return toAdminSection(row, active)
}

const slugField = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    const message = sectionSlugError(value)
    if (message) ctx.addIssue({ code: 'custom', message })
  })

const nameField = z
  .string({ required_error: 'Escribe el nombre de la seccion' })
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(40, 'El nombre no puede superar los 40 caracteres')

const descriptionField = z
  .string()
  .trim()
  .max(300, 'La descripcion no puede superar los 300 caracteres')

/** Crear: el slug es opcional (se deriva del nombre). */
export const createSectionSchema = z.object({
  name: nameField,
  slug: slugField.optional(),
  description: descriptionField.default(''),
  isVisible: z.boolean().default(true),
})

/** Editar: todo opcional, se actualiza lo que llegue. */
export const updateSectionSchema = z.object({
  name: nameField.optional(),
  slug: slugField.optional(),
  description: descriptionField.optional(),
  isVisible: z.boolean().optional(),
})
