import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import {
  assertSameOrigin,
  jsonCreated,
  jsonOk,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import { testimonialSelect, toAdminTestimonial } from '@/lib/api/testimonial-dto'
import { createTestimonialSchema } from '@/lib/testimonials/testimonials'

/** GET /api/admin/testimonials — todos los testimonios, activos e inactivos. */
export async function GET() {
  try {
    await requireAdmin()

    const rows = await prisma.testimonial.findMany({
      orderBy: [{ reviewedAt: 'desc' }, { createdAt: 'desc' }],
      select: testimonialSelect,
    })
    return jsonOk(rows.map(toAdminTestimonial))
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * POST /api/admin/testimonials — crea un testimonio.
 *
 * Sin `reviewedAt`, la fecha de la resena es la de hoy.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    await requireAdmin()

    const input = parseOrThrow(createTestimonialSchema, await readJsonBody(request))

    const created = await prisma.testimonial.create({
      data: {
        customerName: input.customerName,
        comment: input.comment,
        rating: input.rating,
        productName: input.productName,
        avatarUrl: input.avatarUrl,
        isVerified: input.isVerified,
        isActive: input.isActive,
        ...(input.reviewedAt && { reviewedAt: input.reviewedAt }),
      },
      select: testimonialSelect,
    })
    return jsonCreated(toAdminTestimonial(created))
  } catch (error) {
    return toErrorResponse(error)
  }
}
