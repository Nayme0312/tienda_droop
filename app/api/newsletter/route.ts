import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/email/welcome'
import {
  HttpError,
  assertSameOrigin,
  jsonOk,
  readJsonBody,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import { clientKey, createRequestLimiter } from '@/lib/api/rate-limit'
import { verifyTurnstile } from '@/lib/security/turnstile'
import { NEWSLETTER_TURNSTILE_ACTION } from '@/lib/newsletter/constants'

/** 3 peticiones por minuto y por IP, cuenten o no como suscripcion valida. */
const limiter = createRequestLimiter({ limit: 3, windowMs: 60 * 1000 })

/** El cuerpo legitimo ocupa unos cientos de bytes (email + token de Turnstile). */
const MAX_BODY_BYTES = 4 * 1024

/**
 * Formato estricto: ademas de la validacion de zod se exige ASCII, dominio con
 * al menos un punto y TLD de letras, y se rechazan puntos consecutivos o en los
 * extremos de la parte local. Deja fuera direcciones validas por RFC pero
 * rarisimas (comillas, IPs literales), que en un formulario publico casi
 * siempre son basura o intentos de abuso.
 */
const EMAIL_PATTERN =
  /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9_%+-])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/

const emailSchema = z
  .string({ required_error: 'Introduce tu correo', invalid_type_error: 'Correo no valido' })
  .trim()
  .toLowerCase()
  .min(1, 'Introduce tu correo')
  .max(254, 'Correo demasiado largo')
  .email('Correo no valido')
  .regex(EMAIL_PATTERN, 'Correo no valido')
  .refine((value) => !value.includes('..'), 'Correo no valido')

const subscribeSchema = z
  .object({
    email: emailSchema,
    turnstileToken: z
      .string({ required_error: 'Completa la verificacion anti-bots.' })
      .min(1, 'Completa la verificacion anti-bots.')
      .max(2048, 'Verificacion no valida.'),
    /** Honeypot: campo oculto que una persona nunca rellena. */
    website: z.string().max(200).optional(),
  })
  // Campos desconocidos = cliente que no es nuestro formulario.
  .strict('La peticion contiene campos no permitidos.')

/**
 * El mensaje es el mismo tanto si el correo es nuevo como si ya estaba
 * suscrito, para que el formulario no sirva para averiguar que correos
 * estan en la lista.
 */
const SUCCESS_MESSAGE = 'Gracias por unirte al Movimiento. Revisa tu correo.'

/** Igual que en el checkout: SITE_URL en produccion, el host de la peticion en local. */
function siteOrigin(request: NextRequest): string {
  const configured = process.env.SITE_URL?.trim().replace(/\/+$/, '')
  return configured || request.nextUrl.origin
}

/**
 * POST /api/newsletter — suscripcion al boletin ("Unete al Movimiento").
 *
 * Capas de proteccion, de la mas barata a la mas cara. Ninguna peticion llega
 * a la base de datos ni a Resend sin haberlas pasado todas:
 *   1. Mismo origen (bloquea envios desde otras webs).
 *   2. Rate limit: 3 por minuto por IP.
 *   3. Tamano del cuerpo y JSON valido.
 *   4. Honeypot: si viene relleno se responde como exito y no se hace nada,
 *      para que el bot no sepa que fue detectado.
 *   5. Validacion estricta con zod (email y token).
 *   6. Cloudflare Turnstile verificado en el servidor.
 *   7. Un mismo correo recibe la bienvenida una sola vez (welcomeSentAt), asi
 *      que no se puede usar el formulario para inundar el buzon de alguien.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)

    const ip = clientKey(request)
    const limit = limiter.hit(ip)
    if (!limit.allowed) {
      return Response.json(
        { error: 'Demasiados intentos. Espera un minuto y vuelve a probar.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limit.retryAfterSeconds) },
        },
      )
    }

    const declaredLength = Number(request.headers.get('content-length') ?? 0)
    if (declaredLength > MAX_BODY_BYTES) {
      throw new HttpError(413, 'La peticion es demasiado grande.')
    }

    const body = await readJsonBody(request)

    if (
      body &&
      typeof body === 'object' &&
      typeof (body as { website?: unknown }).website === 'string' &&
      (body as { website: string }).website.trim() !== ''
    ) {
      return jsonOk({ message: SUCCESS_MESSAGE })
    }

    const { email, turnstileToken } = parseOrThrow(subscribeSchema, body)

    const captcha = await verifyTurnstile({
      token: turnstileToken,
      expectedAction: NEWSLETTER_TURNSTILE_ACTION,
      remoteIp: ip,
    })
    if (!captcha.ok) {
      if (captcha.reason === 'invalid') {
        throw new HttpError(403, 'No pudimos verificar que no eres un bot. Intentalo de nuevo.')
      }
      throw new HttpError(
        503,
        'La suscripcion no esta disponible en este momento. Intentalo mas tarde.',
      )
    }

    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {},
      create: { email },
    })

    // Ya suscrito y con la bienvenida enviada: no se reenvia.
    if (!subscriber.welcomeSentAt) {
      const sent = await sendWelcomeEmail({
        to: email,
        subscriberId: subscriber.id,
        siteUrl: siteOrigin(request),
      })
      if (sent) {
        await prisma.newsletterSubscriber.update({
          where: { id: subscriber.id },
          data: { welcomeSentAt: new Date() },
        })
      }
    }

    return jsonOk({ message: SUCCESS_MESSAGE })
  } catch (error) {
    return toErrorResponse(error)
  }
}
