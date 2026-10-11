import { API_ROUTES, api } from '@/lib/api/client'
import type { AdminHero } from './types'

/**
 * Capa de servicios del Hero de la portada:
 *
 *   getHero()        ->  GET   /api/admin/hero
 *   saveHero(data)   ->  PATCH /api/admin/hero
 *
 * Los archivos se suben antes con POST /api/admin/uploads (el mismo endpoint
 * que usan las imagenes y videos de producto).
 */
export async function getHero(): Promise<AdminHero> {
  return api.get<AdminHero>(API_ROUTES.hero)
}

export async function saveHero(
  data: Omit<AdminHero, 'updatedAt'>,
): Promise<AdminHero> {
  return api.patch<AdminHero>(API_ROUTES.hero, data)
}
