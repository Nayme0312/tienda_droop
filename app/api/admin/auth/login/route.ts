import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { fakeVerifyPassword, verifyPassword } from '@/lib/auth/password'
import { startSession } from '@/lib/auth/session'
import {
  HttpError,
  assertSameOrigin,
  jsonOk,
  readJsonBody,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import {
  checkRateLimit,
  clearAttempts,
  clientKey,
  registerFailedAttempt,
} from '@/lib/api/rate-limit'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Introduce tu correo').email('Correo no valido'),
  password: z.string().min(1, 'Introduce tu contrasena'),
})

/**
 * Inicio de sesion del administrador.
 *
 * El mensaje de error es siempre el mismo tanto si el email no existe como si
 * la contrasena es incorrecta, y en el caso de email inexistente se gasta el
 * mismo tiempo comparando contra un hash de relleno. Asi no se puede averiguar
 * que correos estan registrados ni por el mensaje ni por la latencia.
 */
const GENERIC_ERROR = 'Correo o contrasena incorrectos.'

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)

    const key = clientKey(request)
    const limit = checkRateLimit(key)
    if (!limit.allowed) {
      return Response.json(
        {
          error: `Demasiados intentos. Vuelve a probar en ${Math.ceil(
            limit.retryAfterSeconds / 60,
          )} minutos.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(limit.retryAfterSeconds) },
        },
      )
    }

    const body = await readJsonBody(request)
    const { email, password } = parseOrThrow(loginSchema, body)

    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
    })

    const valid = admin
      ? await verifyPassword(password, admin.passwordHash)
      : await fakeVerifyPassword(password)

    if (!admin || !valid) {
      registerFailedAttempt(key)
      throw new HttpError(401, GENERIC_ERROR)
    }

    clearAttempts(key)
    await startSession({
      sub: admin.id,
      email: admin.email,
      name: admin.name,
    })

    // Nunca se devuelve passwordHash.
    return jsonOk({
      admin: { id: admin.id, name: admin.name, email: admin.email },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
