import { ApiError, API_ROUTES, api } from '@/lib/api/client'
import type {
  AdminPromotion,
  PromotionInput,
  PromotionStats,
} from './types'

/**
 * Capa de servicios de promociones. Mismo patron que products-service.ts:
 * firmas estables, toda la red a traves del cliente centralizado.
 *
 *   getPromotions()          ->  GET    /api/admin/promotions
 *   getPromotionById(id)     ->  GET    /api/admin/promotions/:id
 *   createPromotion(input)   ->  POST   /api/admin/promotions
 *   updatePromotion(id, i)   ->  PATCH  /api/admin/promotions/:id
 *   deletePromotion(id)      ->  DELETE /api/admin/promotions/:id
 *   togglePromotionStatus()  ->  PATCH  /api/admin/promotions/:id/status
 */

export function computePromotionStats(
  promotions: AdminPromotion[],
): PromotionStats {
  return {
    total: promotions.length,
    running: promotions.filter((p) => p.state === 'running').length,
    scheduled: promotions.filter((p) => p.state === 'scheduled').length,
    expired: promotions.filter((p) => p.state === 'expired').length,
  }
}

/** Filtrado puro por nombre y estado, para la interfaz. */
export function filterPromotions(
  promotions: AdminPromotion[],
  filters: { search?: string; state?: AdminPromotion['state'] | 'all' } = {},
): AdminPromotion[] {
  const search = filters.search?.trim().toLowerCase() ?? ''

  return promotions.filter((promotion) => {
    if (filters.state && filters.state !== 'all' && promotion.state !== filters.state) {
      return false
    }
    if (search && !promotion.name.toLowerCase().includes(search)) return false
    return true
  })
}

export async function getPromotions(): Promise<AdminPromotion[]> {
  return api.get<AdminPromotion[]>(API_ROUTES.promotions)
}

export async function getPromotionById(
  id: string,
): Promise<AdminPromotion | null> {
  try {
    return await api.get<AdminPromotion>(API_ROUTES.promotion(id))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function createPromotion(
  input: PromotionInput,
): Promise<AdminPromotion> {
  return api.post<AdminPromotion>(API_ROUTES.promotions, input)
}

export async function updatePromotion(
  id: string,
  input: Partial<PromotionInput>,
): Promise<AdminPromotion> {
  return api.patch<AdminPromotion>(API_ROUTES.promotion(id), input)
}

export async function deletePromotion(id: string): Promise<void> {
  await api.delete<void>(API_ROUTES.promotion(id))
}

export async function togglePromotionStatus(
  id: string,
  isActive?: boolean,
): Promise<AdminPromotion> {
  return api.patch<AdminPromotion>(
    API_ROUTES.promotionStatus(id),
    isActive === undefined ? undefined : { isActive },
  )
}
