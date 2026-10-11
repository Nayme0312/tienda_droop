import { getWompiConfig } from './config'

/** Estados de transaccion que puede devolver Wompi. */
export type WompiTransactionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DECLINED'
  | 'VOIDED'
  | 'ERROR'

/** Campos de la transaccion que usa la tienda (API y webhook comparten forma). */
export interface WompiTransaction {
  id: string
  reference: string
  status: WompiTransactionStatus
  amount_in_cents: number
  currency: string
  payment_method_type?: string | null
  status_message?: string | null
}

const KNOWN_STATUSES = new Set<WompiTransactionStatus>([
  'PENDING',
  'APPROVED',
  'DECLINED',
  'VOIDED',
  'ERROR',
])

/** Valida la forma minima de una transaccion recibida de Wompi. */
export function parseWompiTransaction(raw: unknown): WompiTransaction | null {
  if (!raw || typeof raw !== 'object') return null
  const tx = raw as Record<string, unknown>
  if (
    typeof tx.id !== 'string' ||
    typeof tx.reference !== 'string' ||
    typeof tx.status !== 'string' ||
    !KNOWN_STATUSES.has(tx.status as WompiTransactionStatus) ||
    typeof tx.amount_in_cents !== 'number' ||
    typeof tx.currency !== 'string'
  ) {
    return null
  }
  return {
    id: tx.id,
    reference: tx.reference,
    status: tx.status as WompiTransactionStatus,
    amount_in_cents: tx.amount_in_cents,
    currency: tx.currency,
    payment_method_type:
      typeof tx.payment_method_type === 'string' ? tx.payment_method_type : null,
    status_message: typeof tx.status_message === 'string' ? tx.status_message : null,
  }
}

/**
 * Consulta una transaccion directamente a la API de Wompi del ambiente
 * configurado. Es la fuente de verdad: nunca se confia en el estado que llegue
 * en la URL de retorno.
 *
 * Devuelve null si la transaccion no existe en este ambiente.
 */
export async function fetchWompiTransaction(
  transactionId: string,
): Promise<WompiTransaction | null> {
  const { apiUrl } = getWompiConfig()

  const response = await fetch(
    `${apiUrl}/transactions/${encodeURIComponent(transactionId)}`,
    { headers: { Accept: 'application/json' }, cache: 'no-store' },
  )

  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Wompi respondio ${response.status} al consultar la transaccion.`)
  }

  const body = (await response.json()) as { data?: unknown }
  return parseWompiTransaction(body.data)
}
