import { API_ROUTES, api } from '@/lib/api/client'
import type { AdminMarquee } from './types'

/**
 * Capa de servicios de la cinta marquesina:
 *
 *   getMarquee()          ->  GET   /api/admin/marquee
 *   saveMarquee(data)     ->  PATCH /api/admin/marquee
 */
export async function getMarquee(): Promise<AdminMarquee> {
  return api.get<AdminMarquee>(API_ROUTES.marquee)
}

export async function saveMarquee(data: {
  text: string
  isActive: boolean
}): Promise<AdminMarquee> {
  return api.patch<AdminMarquee>(API_ROUTES.marquee, data)
}
