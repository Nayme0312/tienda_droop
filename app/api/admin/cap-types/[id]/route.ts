import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import {
  assertSameOrigin,
  conflict,
  jsonNoContent,
  jsonOk,
  notFound,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import { capTypeSelect, toAdminCapType } from '@/lib/api/cap-type-dto'
import { slugifyCapType, updateCapTypeSchema } from '@/lib/caps/cap-types'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * PATCH /api/admin/cap-types/:id — renombra, activa o desactiva un tipo y
 * marca si se vende por talla cerrada.
 *
 * Desactivarlo lo quita del filtro de la tienda y del formulario de producto,
 * pero las gorras que ya lo tienen lo conservan.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request)
    await requireAdmin()
    const { id } = await params

    const input = parseOrThrow(updateCapTypeSchema, await readJsonBody(request))

    const current = await prisma.capType.findUnique({
      where: { id },
      select: { slug: true },
    })
    if (!current) throw notFound('Tipo de gorra no encontrado.')

    const slug = input.name !== undefined ? slugifyCapType(input.name) : current.slug
    if (slug !== current.slug) {
      const taken = await prisma.capType.findUnique({
        where: { slug },
        select: { id: true },
      })
      if (taken) {
        throw conflict(`Ya existe un tipo de gorra llamado "${input.name}".`)
      }
    }

    const updated = await prisma.capType.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name, slug }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.usesFittedSizes !== undefined && {
          usesFittedSizes: input.usesFittedSizes,
        }),
      },
      select: capTypeSelect,
    })
    return jsonOk(toAdminCapType(updated))
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * DELETE /api/admin/cap-types/:id — solo tipos sin gorras asignadas (la
 * relacion es Restrict en la base de datos). Con gorras asignadas, se puede
 * desactivar en su lugar.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request)
    await requireAdmin()
    const { id } = await params

    const current = await prisma.capType.findUnique({
      where: { id },
      select: { _count: { select: { products: true } } },
    })
    if (!current) throw notFound('Tipo de gorra no encontrado.')

    const count = current._count.products
    if (count > 0) {
      throw conflict(
        `Este tipo tiene ${count} ${count === 1 ? 'gorra asignada' : 'gorras asignadas'}. Cambiales el tipo o desactivalo en lugar de eliminarlo.`,
      )
    }

    await prisma.capType.delete({ where: { id } })
    return jsonNoContent()
  } catch (error) {
    return toErrorResponse(error)
  }
}
