import type { NextRequest } from 'next/server'
import { badRequest, jsonOk, notFound, toErrorResponse } from '@/lib/api/http'
import { applyWompiTransaction } from '@/lib/checkout/orders'
import type { PaymentStatusResponse } from '@/lib/checkout/types'
import { fetchWompiTransaction } from '@/lib/wompi/client'
import { WompiConfigError } from '@/lib/wompi/config'

/**
 * GET /api/checkout/status?id=<transaccion> — estado de un pago.
 *
 * Wompi redirige al cliente a /checkout/resultado?id=<transaccion>. Ese id se
 * consulta AQUI directamente a la API de Wompi (nunca se cree lo que diga la
 * URL) y se aplica al pedido. Asi el pedido queda actualizado aunque el webhook
 * tarde o no este configurado todavia (p. ej. en local).
 *
 * Solo devuelve estado, referencia y total: ningun dato personal del cliente.
 */
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')?.trim()
    if (!id || id.length > 100) throw badRequest('Falta el id de la transaccion.')

    const tx = await fetchWompiTransaction(id)
    if (!tx) throw notFound('Transaccion no encontrada.')

    const order = await applyWompiTransaction(tx)
    if (!order) throw notFound('Transaccion no encontrada.')

    return jsonOk<PaymentStatusResponse>({
      status: order.paymentStatus,
      reference: order.reference,
      total: order.total,
      paymentMethodType: order.paymentMethodType,
    })
  } catch (error) {
    if (error instanceof WompiConfigError) {
      console.error('[wompi] configuracion incompleta:', error.message)
      return Response.json({ error: 'Pagos no disponibles.' }, { status: 503 })
    }
    return toErrorResponse(error)
  }
}
