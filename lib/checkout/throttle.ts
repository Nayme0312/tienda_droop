/**
 * Limite simple de pedidos creados por cliente, para que nadie llene la tabla
 * de pedidos pendientes con un script. Misma limitacion que el limitador del
 * login (lib/api/rate-limit.ts): vive en memoria del proceso.
 */
const WINDOW_MS = 10 * 60 * 1000
const MAX_ORDERS = 10

const hits = new Map<string, { count: number; resetAt: number }>()

/** Registra un intento y devuelve false si el cliente supero el limite. */
export function allowCheckout(key: string): boolean {
  const now = Date.now()
  for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)

  const current = hits.get(key)
  if (!current) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  current.count += 1
  return current.count <= MAX_ORDERS
}
