import type { NextRequest } from 'next/server'
import { applyWompiTransaction } from '@/lib/checkout/orders'
import { parseWompiTransaction } from '@/lib/wompi/client'
import { WompiConfigError, getWompiConfig } from '@/lib/wompi/config'
import { isValidEventChecksum, type WompiEventEnvelope } from '@/lib/wompi/signature'

/**
 * POST /api/webhooks/wompi — URL de eventos configurada en el dashboard de
 * Wompi (Desarrolladores > URL de eventos).
 *
 * 1. Verifica el checksum con WOMPI_EVENTS_SECRET: un evento sin firma valida se
 *    rechaza, asi nadie puede "aprobar" un pedido con un POST inventado.
 * 2. Aplica la transaccion al pedido (idempotente).
 * 3. Responde 200. Si respondiera otra cosa, Wompi reintenta (30 min, 3 h y
 *    24 h), que es justo lo que queremos si la base de datos fallo.
 */
export async function POST(request: NextRequest) {
  let config
  try {
    config = getWompiConfig()
  } catch (error) {
    if (error instanceof WompiConfigError) {
      console.error('[wompi] webhook sin configuracion:', error.message)
      return new Response(null, { status: 503 })
    }
    throw error
  }

  let event: WompiEventEnvelope
  try {
    event = (await request.json()) as WompiEventEnvelope
  } catch {
    return new Response(null, { status: 400 })
  }

  if (
    !isValidEventChecksum(event, config.eventsSecret, request.headers.get('x-event-checksum'))
  ) {
    console.warn('[wompi] evento con checksum invalido rechazado.')
    return new Response(null, { status: 401 })
  }

  // Solo interesan las transacciones; otros eventos se confirman sin mas.
  if (event.event !== 'transaction.updated') return new Response(null, { status: 200 })

  const tx = parseWompiTransaction(
    (event.data as { transaction?: unknown } | undefined)?.transaction,
  )
  if (!tx) return new Response(null, { status: 200 })

  try {
    const order = await applyWompiTransaction(tx)
    if (!order) {
      // Referencia ajena a esta tienda (p. ej. otro canal del mismo comercio).
      console.warn(`[wompi] evento para referencia desconocida: ${tx.reference}`)
    }
    return new Response(null, { status: 200 })
  } catch (error) {
    console.error('[wompi] error aplicando evento:', error)
    return new Response(null, { status: 500 })
  }
}
