import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import {
  assertSameOrigin,
  jsonNoContent,
  jsonOk,
  notFound,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import { testimonialSelect, toAdminTestimonial } from '@/lib/api/testimonial-dto'
import { updateTestimonialSchema } from '@/lib/testimonials/testimonials'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/admin/testimonials/:id — un testimonio. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await params

    const row = await prisma.testimonial.findUnique({
      where: { id },
      select: testimonialSelect,
    })
    if (!row) throw notFound('Testimonio no encontrado.')
    return jsonOk(toAdminTestimonial(row))
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * PATCH /api/admin/testimonials/:id — edita cualquier campo. Con solo
 * `{ isActive }` sirve para activarlo o desactivarlo desde la lista.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request)
    await requireAdmin()
    const { id } = await params

    const input = parseOrThrow(updateTestimonialSchema, await readJsonBody(request))

    // P2025 (no existe) lo convierte toErrorResponse en 404.
    const updated = await prisma.testimonial.update({
      where: { id },
      data: {
        ...(input.customerName !== undefined && { customerName: input.customerName }),
        ...(input.comment !== undefined && { comment: input.comment }),
        ...(input.rating !== undefined && { rating: input.rating }),
        ...(input.productName !== undefined && { productName: input.productName }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        ...(input.isVerified !== undefined && { isVerified: input.isVerified }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.reviewedAt !== undefined && { reviewedAt: input.reviewedAt }),
      },
      select: testimonialSelect,
    })
    return jsonOk(toAdminTestimonial(updated))
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * DELETE /api/admin/testimonials/:id — lo elimina definitivamente. La foto
 * subida se queda en storage/uploads (igual que con los productos), porque
 * su URL es inmutable y podria estar en cache.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request)
    await requireAdmin()
    const { id } = await params

    await prisma.testimonial.delete({ where: { id } })
    return jsonNoContent()
  } catch (error) {
    return toErrorResponse(error)
  }
}
