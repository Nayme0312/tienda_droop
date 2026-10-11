import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import {
  assertSameOrigin,
  jsonOk,
  notFound,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import { promotionInclude, toAdminPromotion } from '@/lib/api/promotion-dto'

const statusSchema = z.object({
  isActive: z.boolean().optional(),
})

/**
 * PATCH /api/admin/promotions/:id/status
 *
 * Activa o desactiva la promocion. Sin cuerpo, invierte el estado actual.
 * Desactivar no toca ningun precio: los productos vuelven a mostrar su precio
 * original porque nunca se sobreescribio.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request)
    await requireAdmin()
    const { id } = await params

    let body: unknown = {}
    try {
      const text = await request.text()
      if (text.trim()) body = JSON.parse(text)
    } catch {
      body = {}
    }
    const { isActive } = parseOrThrow(statusSchema, body)

    const current = await prisma.promotion.findUnique({
      where: { id },
      select: { isActive: true },
    })
    if (!current) throw notFound('Promocion no encontrada.')

    const updated = await prisma.promotion.update({
      where: { id },
      data: { isActive: isActive ?? !current.isActive },
      include: promotionInclude,
    })

    return jsonOk(toAdminPromotion(updated))
  } catch (error) {
    return toErrorResponse(error)
  }
}
