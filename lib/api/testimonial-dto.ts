import type { Prisma } from '@prisma/client'
import type { AdminTestimonial } from '@/lib/admin/types'
import type { PublicTestimonial } from '@/lib/testimonials/testimonials'

/** Campos que necesita el DTO de un testimonio. */
export const testimonialSelect = {
  id: true,
  customerName: true,
  avatarUrl: true,
  rating: true,
  comment: true,
  productName: true,
  isVerified: true,
  isActive: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TestimonialSelect

type TestimonialRow = Prisma.TestimonialGetPayload<{ select: typeof testimonialSelect }>

/** Fila de la base de datos -> lo que consume el panel. */
export function toAdminTestimonial(row: TestimonialRow): AdminTestimonial {
  return {
    id: row.id,
    customerName: row.customerName,
    avatarUrl: row.avatarUrl,
    rating: row.rating,
    comment: row.comment,
    productName: row.productName,
    isVerified: row.isVerified,
    isActive: row.isActive,
    reviewedAt: row.reviewedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** Fila -> lo que ve la tienda: sin estado ni fechas internas. */
export function toPublicTestimonial(row: TestimonialRow): PublicTestimonial {
  return {
    id: row.id,
    customerName: row.customerName,
    avatarUrl: row.avatarUrl,
    rating: row.rating,
    comment: row.comment,
    productName: row.productName,
    isVerified: row.isVerified,
    reviewedAt: row.reviewedAt.toISOString(),
  }
}
