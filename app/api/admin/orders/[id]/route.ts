import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { FulfillmentStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  assertSameOrigin,
  jsonOk,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import { orderInclude, toAdminOrder } from '@/lib/api/order-dto'

/**
 * Solo se puede cambiar la gestion interna (preparacion/envio). El estado del
 * pago NO se edita desde el panel: lo fija unicamente Wompi.
 */
const updateSchema = z.object({
  fulfillment: z.nativeEnum(FulfillmentStatus),
})

/** PATCH /api/admin/orders/:id */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request)
    await requireAdmin()
    const { id } = await params
    const { fulfillment } = parseOrThrow(updateSchema, await readJsonBody(request))

    const updated = await prisma.order.update({
      where: { id },
      data: { fulfillment },
      include: orderInclude,
    })

    return jsonOk(toAdminOrder(updated))
  } catch (error) {
    return toErrorResponse(error)
  }
}
