import { Prisma } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { getSession, type SessionPayload } from '@/lib/auth/session'

/**
 * Utilidades compartidas por los route handlers: respuestas con codigo de
 * estado correcto, comprobacion de autenticacion en el servidor y control de
 * origen.
 *
 * Este modulo importa Prisma, asi que NO debe usarse desde middleware.ts
 * (runtime Edge). La proteccion del middleware es una primera barrera; la que
 * cuenta es `requireAdmin()` dentro de cada handler.
 */

export interface ApiErrorBody {
  error: string
  /** Errores por campo, cuando el fallo es de validacion. */
  fieldErrors?: Record<string, string>
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

// --- Respuestas correctas -------------------------------------------------

export function jsonOk<T>(data: T, status = 200): Response {
  return Response.json(data, { status })
}

export function jsonCreated<T>(data: T): Response {
  return jsonOk(data, 201)
}

export function jsonNoContent(): Response {
  return new Response(null, { status: 204 })
}

// --- Errores --------------------------------------------------------------

export const badRequest = (message: string, fieldErrors?: Record<string, string>) =>
  new HttpError(400, message, fieldErrors)
export const unauthorized = (message = 'No autenticado.') =>
  new HttpError(401, message)
export const forbidden = (message = 'No tienes permiso para esta accion.') =>
  new HttpError(403, message)
export const notFound = (message = 'Recurso no encontrado.') =>
  new HttpError(404, message)
export const conflict = (message: string) => new HttpError(409, message)

/**
 * Convierte cualquier excepcion en una respuesta HTTP.
 *
 * Los errores no previstos se registran en el servidor pero al cliente solo
 * llega un mensaje genérico: nunca se devuelve el stack, ni la consulta SQL, ni
 * detalles internos.
 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    const body: ApiErrorBody = { error: error.message }
    if (error.fieldErrors) body.fieldErrors = error.fieldErrors
    return Response.json(body, { status: error.status })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: violacion de restriccion unica. P2025: el registro no existe.
    if (error.code === 'P2002') {
      return Response.json(
        { error: 'Ya existe un registro con ese valor unico.' } satisfies ApiErrorBody,
        { status: 409 },
      )
    }
    if (error.code === 'P2025') {
      return Response.json(
        { error: 'Recurso no encontrado.' } satisfies ApiErrorBody,
        { status: 404 },
      )
    }
  }

  console.error('[api] error no controlado:', error)
  return Response.json(
    { error: 'Error interno del servidor.' } satisfies ApiErrorBody,
    { status: 500 },
  )
}

// --- Autenticacion --------------------------------------------------------

/**
 * Exige sesion valida. Cada handler que lea o modifique datos del panel la
 * llama: asi una peticion directa con curl a POST/PATCH/DELETE recibe 401
 * aunque el middleware se saltara o se desactivara.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) throw unauthorized()
  return session
}

// --- Control de origen (CORS / CSRF) -------------------------------------

/**
 * El panel y la API comparten origen, asi que no hace falta emitir cabeceras
 * CORS ni abrir `Access-Control-Allow-Origin: *`. Lo que si hace falta es lo
 * contrario: rechazar peticiones que modifiquen datos y vengan de otro origen,
 * porque el navegador adjunta la cookie de sesion automaticamente.
 *
 * Se acepta el propio host y, si hace falta en produccion, los origenes
 * listados en ALLOWED_ORIGINS (separados por comas). Cuando no hay cabecera
 * Origin la peticion no viene de un navegador (curl, un script), que no es un
 * vector de CSRF, y se deja pasar para que la autenticacion sea la unica
 * barrera.
 */
export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get('origin')
  if (!origin) return

  const host = request.headers.get('host')
  const allowed = new Set<string>()
  if (host) allowed.add(host)

  for (const entry of (process.env.ALLOWED_ORIGINS ?? '').split(',')) {
    const trimmed = entry.trim()
    if (!trimmed) continue
    try {
      allowed.add(new URL(trimmed).host)
    } catch {
      // Entrada mal formada en la variable de entorno: se ignora.
    }
  }

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw forbidden('Origen no valido.')
  }

  if (!allowed.has(originHost)) {
    throw forbidden('Origen no permitido.')
  }
}

/** Lee y parsea el cuerpo JSON, con un 400 claro si no es JSON valido. */
export async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw badRequest('El cuerpo de la peticion no es JSON valido.')
  }
}
