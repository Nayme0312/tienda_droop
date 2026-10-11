/**
 * Limitador de intentos en memoria, para el login.
 *
 * LIMITACION CONOCIDA: el contador vive en el proceso, asi que se reinicia al
 * reiniciar el servidor y no se comparte entre instancias. Es suficiente para
 * frenar fuerza bruta en desarrollo y en un despliegue de un solo proceso; en
 * produccion con varias instancias habria que moverlo a Redis o equivalente.
 */
interface Attempt {
  count: number
  /** Marca temporal en la que el contador vuelve a cero. */
  resetAt: number
}

const attempts = new Map<string, Attempt>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

/** Evita que el mapa crezca sin limite si llegan muchas claves distintas. */
function pruneExpired(now: number): void {
  for (const [key, attempt] of attempts) {
    if (attempt.resetAt <= now) attempts.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  /** Segundos que faltan para poder reintentar. */
  retryAfterSeconds: number
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now()
  pruneExpired(now)

  const current = attempts.get(key)
  if (!current) return { allowed: true, retryAfterSeconds: 0 }

  if (current.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

export function registerFailedAttempt(key: string): void {
  const now = Date.now()
  const current = attempts.get(key)

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  current.count += 1
}

export function clearAttempts(key: string): void {
  attempts.delete(key)
}

/**
 * Identifica al cliente. Detras de un proxy se usa la primera IP de
 * x-forwarded-for; si no hay ninguna cabecera, se agrupa todo bajo "unknown",
 * que sigue limitando aunque de forma mas basta.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}
