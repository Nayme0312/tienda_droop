import { API_ROUTES, api } from '@/lib/api/client'
import type { AdminCapType } from './types'

/**
 * Capa de servicios de los tipos de gorra. Mismo patron que secciones:
 *
 *   getCapTypes()             ->  GET    /api/admin/cap-types
 *   createCapType(input)      ->  POST   /api/admin/cap-types
 *   updateCapType(id, input)  ->  PATCH  /api/admin/cap-types/:id
 *   deleteCapType(id)         ->  DELETE /api/admin/cap-types/:id
 */
export interface CapTypeInput {
  name: string
  isActive: boolean
  usesFittedSizes: boolean
}

export async function getCapTypes(): Promise<AdminCapType[]> {
  return api.get<AdminCapType[]>(API_ROUTES.capTypes)
}

export async function createCapType(input: CapTypeInput): Promise<AdminCapType> {
  return api.post<AdminCapType>(API_ROUTES.capTypes, input)
}

export async function updateCapType(
  id: string,
  input: Partial<CapTypeInput>,
): Promise<AdminCapType> {
  return api.patch<AdminCapType>(API_ROUTES.capType(id), input)
}

/** Solo tipos sin gorras asignadas. */
export async function deleteCapType(id: string): Promise<void> {
  return api.delete<void>(API_ROUTES.capType(id))
}
