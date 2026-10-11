import { Prisma, PromotionScope as DbPromotionScope } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { AdminPromotion, PromotionScope } from '@/lib/admin/types'
import { getPromotionState, type PromotionCandidate } from './promotion-pricing'

/** Relaciones que necesita el DTO de promocion. */
export const promotionInclude = {
  products: { select: { productId: true } },
} satisfies Prisma.PromotionInclude

export type PromotionWithRelations = Prisma.PromotionGetPayload<{
  include: typeof promotionInclude
}>

export function toPromotionScope(scope: DbPromotionScope): PromotionScope {
  return scope === DbPromotionScope.ALL ? 'all' : 'selected'
}

export function toDbScope(scope: PromotionScope): DbPromotionScope {
  return scope === 'all' ? DbPromotionScope.ALL : DbPromotionScope.SELECTED
}

export function toAdminPromotion(
  promotion: PromotionWithRelations,
  now: Date = new Date(),
): AdminPromotion {
  return {
    id: promotion.id,
    name: promotion.name,
    discountPercent: promotion.discountPercent,
    scope: toPromotionScope(promotion.scope),
    startsAt: promotion.startsAt.toISOString(),
    endsAt: promotion.endsAt.toISOString(),
    isActive: promotion.isActive,
    productIds: promotion.products.map((row) => row.productId),
    state: getPromotionState(promotion, now),
    createdAt: promotion.createdAt.toISOString(),
    updatedAt: promotion.updatedAt.toISOString(),
  }
}

/** Convierte una fila de promocion en candidata para el calculo de precios. */
export function toPromotionCandidate(
  promotion: PromotionWithRelations,
): PromotionCandidate {
  return {
    id: promotion.id,
    name: promotion.name,
    discountPercent: promotion.discountPercent,
    scope: toPromotionScope(promotion.scope),
    isActive: promotion.isActive,
    startsAt: promotion.startsAt,
    endsAt: promotion.endsAt,
    productIds: promotion.products.map((row) => row.productId),
  }
}

/**
 * Filtro de las promociones que pueden estar aplicandose ahora mismo.
 *
 * Se resuelve en una sola consulta para todo el listado: asi calcular el precio
 * promocional de N productos no genera N consultas.
 */
export function runningPromotionsWhere(now: Date): Prisma.PromotionWhereInput {
  return {
    isActive: true,
    startsAt: { lte: now },
    endsAt: { gte: now },
  }
}

/**
 * Carga las promociones vigentes como candidatas para el calculo de precios.
 * Una sola consulta por peticion, sirva para 1 producto o para todo el catalogo.
 */
export async function loadRunningPromotions(
  now: Date = new Date(),
): Promise<PromotionCandidate[]> {
  const promotions = await prisma.promotion.findMany({
    where: runningPromotionsWhere(now),
    include: promotionInclude,
  })
  return promotions.map(toPromotionCandidate)
}
