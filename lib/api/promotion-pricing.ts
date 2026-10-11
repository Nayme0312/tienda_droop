import type { AppliedPromotion, PromotionState } from '@/lib/admin/types'

/**
 * Resolucion de promociones y calculo del precio promocional.
 *
 * REGLA CENTRAL: el precio original del producto NUNCA se modifica.
 * `Product.price` se queda como esta y el precio con descuento se calcula al
 * leer, aqui. Si una promocion se desactiva o caduca, el producto vuelve solo a
 * su precio original porque nunca se sobreescribio nada.
 *
 * REGLA DE PRIORIDAD (los descuentos NO se acumulan nunca):
 *   1. Si hay alguna promocion vigente de ambito 'selected' que incluya el
 *      producto, gana esa. La especifica tiene prioridad sobre la global.
 *   2. Si no, gana la promocion vigente de ambito 'all'.
 *   3. Si dentro del grupo ganador hay varias, se aplica la del descuento MAS
 *      ALTO (lo mejor para el cliente).
 *   4. Solo se aplica UNA promocion. Nunca se suman ni se componen porcentajes.
 */

/** Promocion candidata, tal como la necesita la resolucion. */
export interface PromotionCandidate {
  id: string
  name: string
  discountPercent: number
  scope: 'all' | 'selected'
  isActive: boolean
  startsAt: Date
  endsAt: Date
  /** Ids de producto. Solo relevante cuando scope es 'selected'. */
  productIds: string[]
}

/** Vigente = activada manualmente Y dentro del rango de fechas. */
export function isPromotionRunning(
  promotion: { isActive: boolean; startsAt: Date; endsAt: Date },
  now: Date = new Date(),
): boolean {
  if (!promotion.isActive) return false
  return promotion.startsAt <= now && promotion.endsAt >= now
}

export function getPromotionState(
  promotion: { isActive: boolean; startsAt: Date; endsAt: Date },
  now: Date = new Date(),
): PromotionState {
  if (!promotion.isActive) return 'disabled'
  if (promotion.endsAt < now) return 'expired'
  if (promotion.startsAt > now) return 'scheduled'
  return 'running'
}

/** La de mayor descuento, o null si la lista esta vacia. */
function bestOf(candidates: PromotionCandidate[]): PromotionCandidate | null {
  if (candidates.length === 0) return null
  return candidates.reduce((best, current) =>
    current.discountPercent > best.discountPercent ? current : best,
  )
}

/**
 * Promocion que gana para un producto, o null si ninguna le aplica.
 * `promotions` debe traer solo las vigentes (usa `isPromotionRunning`).
 */
export function resolvePromotionForProduct(
  productId: string,
  runningPromotions: PromotionCandidate[],
): AppliedPromotion | null {
  const specific = runningPromotions.filter(
    (promotion) =>
      promotion.scope === 'selected' && promotion.productIds.includes(productId),
  )

  // Paso 1 y 3: la especifica gana; entre especificas, la de mayor descuento.
  const winner =
    bestOf(specific) ??
    // Paso 2: si no habia especifica, la global.
    bestOf(runningPromotions.filter((promotion) => promotion.scope === 'all'))

  if (!winner) return null

  return {
    id: winner.id,
    name: winner.name,
    discountPercent: winner.discountPercent,
    scope: winner.scope,
  }
}

/**
 * Precio con el descuento aplicado, redondeado al peso entero.
 *
 * Se redondea con Math.round sobre el importe final para que el precio
 * mostrado y el que se cobrara sean exactamente el mismo numero.
 */
export function applyDiscount(price: number, discountPercent: number): number {
  return Math.round((price * (100 - discountPercent)) / 100)
}
