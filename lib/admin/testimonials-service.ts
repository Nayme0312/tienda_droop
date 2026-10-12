import { API_ROUTES, api } from '@/lib/api/client'
import type { AdminTestimonial } from './types'

/**
 * Capa de servicios de los testimonios. Mismo patron que tipos de gorra:
 *
 *   getTestimonials()             ->  GET    /api/admin/testimonials
 *   createTestimonial(input)      ->  POST   /api/admin/testimonials
 *   updateTestimonial(id, input)  ->  PATCH  /api/admin/testimonials/:id
 *   deleteTestimonial(id)         ->  DELETE /api/admin/testimonials/:id
 *
 * La foto se sube antes con POST /api/admin/uploads (uploadProductImage).
 */
export interface TestimonialInput {
  customerName: string
  comment: string
  rating: number
  productName: string | null
  avatarUrl: string | null
  isVerified: boolean
  isActive: boolean
  /** ISO 8601. */
  reviewedAt: string
}

export async function getTestimonials(): Promise<AdminTestimonial[]> {
  return api.get<AdminTestimonial[]>(API_ROUTES.testimonials)
}

export async function createTestimonial(
  input: TestimonialInput,
): Promise<AdminTestimonial> {
  return api.post<AdminTestimonial>(API_ROUTES.testimonials, input)
}

export async function updateTestimonial(
  id: string,
  input: Partial<TestimonialInput>,
): Promise<AdminTestimonial> {
  return api.patch<AdminTestimonial>(API_ROUTES.testimonial(id), input)
}

export async function deleteTestimonial(id: string): Promise<void> {
  return api.delete<void>(API_ROUTES.testimonial(id))
}
