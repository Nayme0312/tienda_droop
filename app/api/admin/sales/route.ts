import type { NextRequest } from 'next/server'
import {
  assertSameOrigin,
  jsonCreated,
  jsonOk,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import { toAdminOrder } from '@/lib/api/order-dto'
import { manualSaleSchema } from '@/lib/admin/sale-schema'
import { createManualSale } from '@/lib/sales/manual-sale'

/**
 * POST /api/admin/sales — registra una venta presencial (efectivo,
 * transferencia u otro) y descuenta el stock. Responde 201 con el pedido
 * creado, o 200 con el ya existente si la misma venta se envio dos veces.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    await requireAdmin()

    const input = parseOrThrow(manualSaleSchema, await readJsonBody(request))
    const { order, created } = await createManualSale(input)

    return created ? jsonCreated(toAdminOrder(order)) : jsonOk(toAdminOrder(order))
  } catch (error) {
    return toErrorResponse(error)
  }
}
