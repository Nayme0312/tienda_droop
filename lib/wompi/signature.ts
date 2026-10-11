import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Firmas de Wompi (documentacion oficial, docs.wompi.co):
 *
 *  - Firma de integridad del Web Checkout:
 *      SHA256("<reference><amountInCents><currency><integritySecret>")
 *    Impide que alguien cambie el monto o la referencia en la URL del checkout.
 *
 *  - Checksum de eventos (webhook):
 *      SHA256(<valores de signature.properties en orden><timestamp><eventsSecret>)
 *    Demuestra que el evento lo envio Wompi y no un tercero.
 */

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function integritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string,
): string {
  return sha256Hex(`${reference}${amountInCents}${currency}${integritySecret}`)
}

/** Lee una ruta tipo "transaction.amount_in_cents" dentro de event.data. */
function readPath(data: unknown, path: string): unknown {
  let current: unknown = data
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

export interface WompiEventEnvelope {
  event?: unknown
  data?: unknown
  signature?: { properties?: unknown; checksum?: unknown }
  timestamp?: unknown
}

/**
 * true si el checksum del evento es valido. Comparacion en tiempo constante
 * para no filtrar informacion por tiempos de respuesta.
 */
export function isValidEventChecksum(
  event: WompiEventEnvelope,
  eventsSecret: string,
  headerChecksum?: string | null,
): boolean {
  const properties = event.signature?.properties
  const checksum =
    (typeof event.signature?.checksum === 'string' && event.signature.checksum) ||
    headerChecksum ||
    ''
  if (!Array.isArray(properties) || properties.length === 0 || !checksum) return false
  if (typeof event.timestamp !== 'number' && typeof event.timestamp !== 'string') {
    return false
  }

  const values = properties.map((property) => {
    if (typeof property !== 'string') return ''
    const value = readPath(event.data, property)
    return value === undefined || value === null ? '' : String(value)
  })

  const expected = sha256Hex(`${values.join('')}${event.timestamp}${eventsSecret}`)
  const received = checksum.toLowerCase()
  if (received.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received))
}
