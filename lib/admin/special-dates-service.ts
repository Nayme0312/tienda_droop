import { API_ROUTES, api } from '@/lib/api/client'
import type { AdminSpecialDate } from './types'

/**
 * Capa de servicios de las fechas especiales. Mismo patron que secciones:
 *
 *   getSpecialDates()                   ->  GET   /api/admin/special-dates
 *   setSpecialDateActive(slug, active)  ->  PATCH /api/admin/special-dates/:slug
 */
export async function getSpecialDates(): Promise<AdminSpecialDate[]> {
  return api.get<AdminSpecialDate[]>(API_ROUTES.specialDates)
}

export async function setSpecialDateActive(
  slug: string,
  isActive: boolean,
): Promise<AdminSpecialDate> {
  return api.patch<AdminSpecialDate>(API_ROUTES.specialDate(slug), {
    isActive,
  })
}
