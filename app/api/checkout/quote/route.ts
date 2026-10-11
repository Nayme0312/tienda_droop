import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { assertSameOrigin, jsonOk, readJsonBody, toErrorResponse } from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import { priceCart } from '@/lib/checkout/pricing'
import { checkoutItemsSchema } from '@/lib/checkout/types'

const quoteSchema = z.object({ items: checkoutItemsSchema })

/**
 * POST /api/checkout/quote — resumen del pedido calculado por el servidor.
 *
 * La pagina de checkout muestra ESTE total (no el del carrito local), de modo
 * que lo que el cliente ve antes de pagar es exactamente lo que se cobrara.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    const { items } = parseOrThrow(quoteSchema, await readJsonBody(request))
    return jsonOk(await priceCart(items))
  } catch (error) {
    return toErrorResponse(error)
  }
}
