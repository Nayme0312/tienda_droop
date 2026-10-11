import { SignJWT, jwtVerify } from 'jose'

/**
 * Firma y verificacion del JWT de sesion.
 *
 * Se usa `jose` y no `jsonwebtoken` porque este modulo tambien se ejecuta
 * dentro de middleware.ts, que corre en el runtime Edge: alli no existe el
 * modulo `crypto` de Node y `jsonwebtoken` no funciona. `jose` usa WebCrypto y
 * sirve en Edge y en Node sin cambios.
 *
 * Este archivo no importa nada de `next/headers` ni de Prisma a proposito, para
 * que siga siendo apto para Edge.
 */
export const SESSION_COOKIE = 'streetvibe_admin_session'

/** Duracion de la sesion: 8 horas. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8

const ISSUER = 'streetvibe-admin'
const AUDIENCE = 'streetvibe-panel'

export interface SessionPayload {
  /** Id del administrador. */
  sub: string
  email: string
  name: string
}

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET no esta definida o es demasiado corta (minimo 32 caracteres). Revisa .env.',
    )
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey())
}

/**
 * Devuelve la sesion si el token es valido y no ha caducado; null en cualquier
 * otro caso (firma invalida, caducado, emisor distinto, formato roto).
 *
 * Un AUTH_SECRET ausente si propaga la excepcion: es un error de configuracion
 * que debe verse, no un simple "no autenticado".
 */
export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  const key = getSecretKey()
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    })

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.name !== 'string'
    ) {
      return null
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    }
  } catch {
    return null
  }
}
