import { API_ROUTES, api } from '@/lib/api/client'
import type { AdminStoreSection } from './types'

/**
 * Capa de servicios de las secciones de tienda. Mismo patron que productos y
 * promociones: firmas estables y toda la red a traves del cliente centralizado.
 *
 *   getSections()                    ->  GET   /api/admin/categories
 *   setSectionVisibility(slug, bool) ->  PATCH /api/admin/categories/:slug/visibility
 *   createSection(input)             ->  POST   /api/admin/categories
 *   updateSection(slug, input)       ->  PATCH  /api/admin/categories/:slug
 *   deleteSection(slug)              ->  DELETE /api/admin/categories/:slug
 */
export async function getSections(): Promise<AdminStoreSection[]> {
  return api.get<AdminStoreSection[]>(API_ROUTES.categories)
}

/**
 * Cambia la visibilidad de una seccion. Sin `isVisible` invierte la actual.
 */
export async function setSectionVisibility(
  slug: string,
  isVisible?: boolean,
): Promise<AdminStoreSection> {
  return api.patch<AdminStoreSection>(
    API_ROUTES.categoryVisibility(slug),
    isVisible === undefined ? undefined : { isVisible },
  )
}

/** Datos editables de una seccion. */
export interface SectionInput {
  name: string
  /** Opcional al crear: si se omite, la API lo deriva del nombre. */
  slug?: string
  description: string
  isVisible: boolean
}

/** POST /api/admin/categories */
export async function createSection(
  input: SectionInput,
): Promise<AdminStoreSection> {
  return api.post<AdminStoreSection>(API_ROUTES.categories, input)
}

/** PATCH /api/admin/categories/:slug */
export async function updateSection(
  slug: string,
  input: Partial<SectionInput>,
): Promise<AdminStoreSection> {
  return api.patch<AdminStoreSection>(API_ROUTES.category(slug), input)
}

/** DELETE /api/admin/categories/:slug (solo secciones sin productos) */
export async function deleteSection(slug: string): Promise<void> {
  return api.delete<void>(API_ROUTES.category(slug))
}
