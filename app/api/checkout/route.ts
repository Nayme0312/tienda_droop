import type { NextRequest } from 'next/server'
import {
  HttpError,
  assertSameOrigin,
  jsonCreated,
  readJsonBody,
  toErrorResponse,
} from '@/lib/api/http'
import { clientKey } from '@/lib/api/rate-limit'
import { parseOrThrow } from '@/lib/api/validate'
import { createPendingOrder } from '@/lib/checkout/orders'
import { priceCart } from '@/lib/checkout/pricing'
import { allowCheckout } from '@/lib/checkout/throttle'
import {
  createCheckoutSchema,
  type CreateCheckoutResponse,
} from '@/lib/checkout/types'
import { WompiConfigError } from '@/lib/wompi/config'

/**
 * Origen publico de la tienda para la URL de retorno de Wompi. En produccion
 * conviene fijarlo con SITE_URL (detras de un proxy el host de la peticion
 * puede no ser el publico).
 */
function siteOrigin(request: NextRequest): string {
  const configured = process.env.SITE_URL?.trim().replace(/\/+$/, '')
  return configured || request.nextUrl.origin
}

/**
 * POST /api/checkout — inicia un pago con Wompi.
 *
 * Recibe solo productos, cantidades y datos de entrega. Calcula el total en el
 * servidor, guarda el pedido como PENDING y devuelve la URL firmada del Web
 * Checkout. El navegador solo tiene que redirigir a esa URL.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    if (!allowCheckout(clientKey(request))) {
      throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.')
    }

    const { items, customer } = parseOrThrow(
      createCheckoutSchema,
      await readJsonBody(request),
    )

    const quote = await priceCart(items)
    const { reference, checkoutUrl } = await createPendingOrder(
      quote,
      customer,
      `${siteOrigin(request)}/checkout/resultado`,
    )

    return jsonCreated<CreateCheckoutResponse>({
      reference,
      total: quote.total,
      checkoutUrl,
    })
  } catch (error) {
    if (error instanceof WompiConfigError) {
      console.error('[wompi] configuracion incompleta:', error.message)
      return Response.json(
        { error: 'El pago en linea no esta disponible en este momento. Usa WhatsApp.' },
        { status: 503 },
      )
    }
    return toErrorResponse(error)
  }
}
