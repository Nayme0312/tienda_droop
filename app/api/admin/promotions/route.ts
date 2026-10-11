import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { promotionInputSchema } from '@/lib/admin/promotion-schema'
import {
  assertSameOrigin,
  badRequest,
  jsonCreated,
  jsonOk,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import {
  promotionInclude,
  toAdminPromotion,
  toDbScope,
} from '@/lib/api/promotion-dto'

/**
 * Comprueba que todos los ids de producto existan. Sin esto se podrian guardar
 * promociones apuntando a productos inexistentes.
 */
async function assertProductsExist(productIds: string[]): Promise<void> {
  if (productIds.length === 0) return

  const unique = [...new Set(productIds)]
  const found = await prisma.product.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  })

  if (found.length !== unique.length) {
    throw badRequest('Algun producto seleccionado no existe.', {
      productIds: 'Uno o varios productos seleccionados ya no existen',
    })
  }
}

/** GET /api/admin/promotions */
export async function GET() {
  try {
    await requireAdmin()

    const promotions = await prisma.promotion.findMany({
      include: promotionInclude,
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    return jsonOk(promotions.map((p) => toAdminPromotion(p, now)))
  } catch (error) {
    return toErrorResponse(error)
  }
}

/** POST /api/admin/promotions */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    await requireAdmin()

    const body = await readJsonBody(request)
    const input = parseOrThrow(promotionInputSchema, body)

    // En ambito 'all' se ignoran los productos: la promocion cubre el catalogo.
    const productIds =
      input.scope === 'selected' ? [...new Set(input.productIds)] : []
    await assertProductsExist(productIds)

    const created = await prisma.promotion.create({
      data: {
        name: input.name,
        discountPercent: input.discountPercent,
        scope: toDbScope(input.scope),
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        isActive: input.isActive,
        products: {
          create: productIds.map((productId) => ({ productId })),
        },
      },
      include: promotionInclude,
    })

    return jsonCreated(toAdminPromotion(created))
  } catch (error) {
    return toErrorResponse(error)
  }
}
