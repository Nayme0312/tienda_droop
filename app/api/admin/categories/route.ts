import type { NextRequest } from 'next/server'
import { ProductStatus as DbProductStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  assertSameOrigin,
  badRequest,
  conflict,
  jsonCreated,
  jsonOk,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import {
  createSectionSchema,
  sectionSelect,
  toAdminSection,
} from '@/lib/api/section-dto'
import { sectionSlugError, slugifySection } from '@/lib/sections'

/**
 * GET /api/admin/categories — categorias como "secciones de tienda".
 *
 * Devuelve la visibilidad y cuantos productos hay detras de cada una: el total
 * y los que el cliente veria si la seccion estuviera visible. Con eso el panel
 * puede avisar antes de ocultar algo con catalogo dentro.
 */
export async function GET() {
  try {
    await requireAdmin()

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: sectionSelect,
    })

    // Un solo groupBy para los activos de todas las categorias.
    const activeByCategory = await prisma.product.groupBy({
      by: ['categoryId'],
      where: { status: DbProductStatus.ACTIVE },
      _count: { _all: true },
    })
    const activeCount = new Map(
      activeByCategory.map((row) => [row.categoryId, row._count._all]),
    )

    return jsonOk(
      categories.map((category) =>
        toAdminSection(category, activeCount.get(category.id) ?? 0),
      ),
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * POST /api/admin/categories — crea una seccion de tienda.
 *
 * El slug es opcional: si no llega se deriva del nombre. Es la URL publica de
 * la seccion (/:slug), asi que debe ser unico y no chocar con rutas propias.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    await requireAdmin()

    const input = parseOrThrow(createSectionSchema, await readJsonBody(request))

    const slug = input.slug || slugifySection(input.name)
    const slugError = sectionSlugError(slug)
    if (slugError) {
      throw badRequest(slugError, { slug: slugError })
    }

    const existing = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (existing) {
      throw conflict(`Ya existe una seccion con el identificador "${slug}".`)
    }

    const created = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        isVisible: input.isVisible,
      },
      select: sectionSelect,
    })

    return jsonCreated(toAdminSection(created, 0))
  } catch (error) {
    return toErrorResponse(error)
  }
}
