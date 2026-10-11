import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import {
  checkPromotionRules,
  promotionPatchSchema,
} from '@/lib/admin/promotion-schema'
import {
  assertSameOrigin,
  badRequest,
  jsonNoContent,
  jsonOk,
  notFound,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import {
  promotionInclude,
  toAdminPromotion,
  toDbScope,
  toPromotionScope,
} from '@/lib/api/promotion-dto'

type RouteContext = { params: Promise<{ id: string }> }

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

/** GET /api/admin/promotions/:id */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await params

    const promotion = await prisma.promotion.findUnique({
      where: { id },
      include: promotionInclude,
    })
    if (!promotion) throw notFound('Promocion no encontrada.')

    return jsonOk(toAdminPromotion(promotion))
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * PATCH /api/admin/promotions/:id — actualizacion parcial.
 *
 * Las reglas cruzadas (fin >= inicio, y al menos un producto en ambito
 * 'selected') se comprueban tras fusionar con lo que ya hay en la base de datos,
 * porque el cuerpo puede traer solo uno de los campos implicados.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request)
    await requireAdmin()
    const { id } = await params

    const body = await readJsonBody(request)
    const input = parseOrThrow(promotionPatchSchema, body)

    const current = await prisma.promotion.findUnique({
      where: { id },
      include: promotionInclude,
    })
    if (!current) throw notFound('Promocion no encontrada.')

    const nextScope = input.scope ?? toPromotionScope(current.scope)
    const nextStartsAt = input.startsAt ?? current.startsAt.toISOString()
    const nextEndsAt = input.endsAt ?? current.endsAt.toISOString()
    const nextProductIds =
      nextScope === 'selected'
        ? [
            ...new Set(
              input.productIds ?? current.products.map((row) => row.productId),
            ),
          ]
        : []

    const ruleError = checkPromotionRules({
      scope: nextScope,
      startsAt: nextStartsAt,
      endsAt: nextEndsAt,
      productIds: nextProductIds,
    })
    if (ruleError) {
      throw badRequest(ruleError.message, {
        [ruleError.field]: ruleError.message,
      })
    }

    await assertProductsExist(nextProductIds)

    // La lista de productos se reemplaza en bloque, dentro de la misma
    // transaccion que el resto de los campos.
    const replaceProducts =
      input.productIds !== undefined || input.scope !== undefined

    const updated = await prisma.$transaction(async (tx) => {
      if (replaceProducts) {
        await tx.promotionProduct.deleteMany({ where: { promotionId: id } })
      }

      return tx.promotion.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.discountPercent !== undefined && {
            discountPercent: input.discountPercent,
          }),
          ...(input.scope !== undefined && { scope: toDbScope(input.scope) }),
          ...(input.startsAt !== undefined && {
            startsAt: new Date(input.startsAt),
          }),
          ...(input.endsAt !== undefined && { endsAt: new Date(input.endsAt) }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(replaceProducts && {
            products: {
              create: nextProductIds.map((productId) => ({ productId })),
            },
          }),
        },
        include: promotionInclude,
      })
    })

    return jsonOk(toAdminPromotion(updated))
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * DELETE /api/admin/promotions/:id
 *
 * Las filas de PromotionProduct caen por `onDelete: Cascade`. Los productos NO
 * se ven afectados: su `price` nunca fue modificado, asi que al desaparecer la
 * promocion simplemente dejan de mostrar precio promocional.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request)
    await requireAdmin()
    const { id } = await params

    const existing = await prisma.promotion.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!existing) throw notFound('Promocion no encontrada.')

    await prisma.promotion.delete({ where: { id } })

    return jsonNoContent()
  } catch (error) {
    return toErrorResponse(error)
  }
}
