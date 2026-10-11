import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { AdminCapType } from '@/lib/admin/types'
import { isCapSection } from '@/lib/caps/cap-types'
import { badRequest } from './http'

/** Campos que necesita el DTO de un tipo de gorra. */
export const capTypeSelect = {
  id: true,
  name: true,
  slug: true,
  isActive: true,
  usesFittedSizes: true,
  _count: { select: { products: true } },
} satisfies Prisma.CapTypeSelect

type CapTypeRow = Prisma.CapTypeGetPayload<{ select: typeof capTypeSelect }>

/** Fila de la base de datos -> lo que consume el panel. */
export function toAdminCapType(row: CapTypeRow): AdminCapType {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.isActive,
    usesFittedSizes: row.usesFittedSizes,
    productCount: row._count.products,
  }
}

/**
 * Tipo de gorra que se guardara en un producto.
 *
 *  - Si el producto no es de la seccion gorras, siempre null: un producto que
 *    se mueve a otra seccion pierde su tipo.
 *  - `requested` undefined = no se toca (PATCH sin el campo): se conserva el
 *    actual.
 *  - Conservar el tipo que ya tenia vale aunque ese tipo este desactivado;
 *    asignar uno nuevo exige que exista y este activo.
 */
export async function resolveProductCapTypeId({
  categorySlug,
  requested,
  current = null,
}: {
  categorySlug: string
  requested: string | null | undefined
  current?: string | null
}): Promise<string | null> {
  if (!isCapSection(categorySlug)) return null
  if (requested === undefined) return current
  if (requested === null || requested === current) return requested

  const capType = await prisma.capType.findUnique({
    where: { id: requested },
    select: { isActive: true },
  })
  if (!capType) {
    throw badRequest('Tipo de gorra no valido.', {
      capTypeId: 'Ese tipo de gorra no existe',
    })
  }
  if (!capType.isActive) {
    throw badRequest('Ese tipo de gorra esta desactivado.', {
      capTypeId: 'Ese tipo de gorra esta desactivado',
    })
  }
  return requested
}
