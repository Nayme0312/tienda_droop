/**
 * Verificacion en el servidor de Cloudflare Turnstile (anti-bots).
 *
 * El widget del navegador solo produce un token; lo que de verdad bloquea a un
 * bot es esta comprobacion contra la API de Cloudflare con la clave secreta.
 * Cada token sirve una sola vez y caduca a los 300 segundos.
 *
 * Falla CERRADO: si TURNSTILE_SECRET_KEY no esta definida, o Cloudflare no
 * responde, la verificacion no pasa. Asi un error de configuracion no deja
 * el formulario abierto a bots ni gasta la cuota de Resend.
 */
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TIMEOUT_MS = 5000

interface SiteverifyResponse {
  success: boolean
  action?: string
  hostname?: string
  'error-codes'?: string[]
}

export type TurnstileResult =
  | { ok: true }
  | { ok: false; reason: 'not-configured' | 'invalid' | 'unavailable' }

export async function verifyTurnstile(params: {
  token: string
  /** Debe coincidir con el `action` con el que se renderizo el widget. */
  expectedAction: string
  remoteIp?: string
}): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    console.error('[turnstile] TURNSTILE_SECRET_KEY no esta definida: se rechaza la peticion.')
    return { ok: false, reason: 'not-configured' }
  }

  const form = new URLSearchParams({ secret, response: params.token })
  if (params.remoteIp && params.remoteIp !== 'unknown') {
    form.set('remoteip', params.remoteIp)
  }

  let data: SiteverifyResponse
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })
    if (!response.ok) {
      console.error('[turnstile] siteverify respondio', response.status)
      return { ok: false, reason: 'unavailable' }
    }
    data = (await response.json()) as SiteverifyResponse
  } catch (error) {
    console.error('[turnstile] No se pudo contactar con Cloudflare:', error)
    return { ok: false, reason: 'unavailable' }
  }

  if (!data.success) {
    return { ok: false, reason: 'invalid' }
  }

  // Un token emitido para otro formulario no vale para este. Las claves de
  // prueba de Cloudflare no devuelven `action`, por eso solo se compara si viene.
  if (data.action && data.action !== params.expectedAction) {
    return { ok: false, reason: 'invalid' }
  }

  return { ok: true }
}
