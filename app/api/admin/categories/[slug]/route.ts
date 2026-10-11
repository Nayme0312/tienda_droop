import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import {
  assertSameOrigin,
  badRequest,
  conflict,
  jsonNoContent,
  jsonOk,
  notFound,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import { loadAdminSection, updateSectionSchema } from '@/lib/api/section-dto'
import { isBuiltInSection } from '@/lib/sections'

type RouteContext = { params: Promise<{ slug: string }> }

/**
 * PATCH /api/admin/categories/:slug — edita nombre, identificador,
 * descripcion y visibilidad de una seccion.
 *
 * Cambiar el identificador cambia la URL publica de la seccion. Las secciones
 * de siempre (camisas, gorras, pines) no lo permiten: hay logica que depende
 * de su slug.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request)
    await requireAdmin()
    const { slug } = await params

    const input = parseOrThrow(updateSectionSchema, await readJsonBody(request))

    const current = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!current) throw notFound('Seccion no encontrada.')

    const nextSlug = input.slug ?? slug
    if (nextSlug !== slug) {
      if (isBuiltInSection(slug)) {
        const message = 'El identificador de esta seccion no se puede cambiar'
        throw badRequest(message, { slug: message })
      }
      const taken = await prisma.category.findUnique({
        where: { slug: nextSlug },
        select: { id: true },
      })
      if (taken) {
        throw conflict(`Ya existe una seccion con el identificador "${nextSlug}".`)
      }
    }

    await prisma.category.update({
      where: { slug },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(nextSlug !== slug && { slug: nextSlug }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.isVisible !== undefined && { isVisible: input.isVisible }),
      },
    })

    return jsonOk(await loadAdminSection(nextSlug))
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * DELETE /api/admin/categories/:slug — elimina una seccion vacia.
 *
 * Una seccion con productos no se puede borrar (la relacion es Restrict en la
 * base de datos): antes hay que mover esos productos a otra seccion o
 * eliminarlos. Asi nunca se pierde catalogo por accidente.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request)
    await requireAdmin()
    const { slug } = await params

    const current = await prisma.category.findUnique({
      where: { slug },
      select: { id: true, _count: { select: { products: true } } },
    })
    if (!current) throw notFound('Seccion no encontrada.')

    const count = current._count.products
    if (count > 0) {
      throw conflict(
        `La seccion tiene ${count} ${count === 1 ? 'producto' : 'productos'}. Muevelos a otra seccion o eliminalos antes de borrarla.`,
      )
    }

    await prisma.category.delete({ where: { slug } })
    return jsonNoContent()
  } catch (error) {
    return toErrorResponse(error)
  }
}
