import { cookies } from 'next/headers'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from './jwt'

/**
 * Gestion de la cookie de sesion en route handlers y server components.
 *
 * La cookie es httpOnly (inaccesible desde JavaScript, por tanto a prueba de
 * XSS que intente robarla), sameSite=lax (bloquea el envio en peticiones
 * cross-site, que es la base del CSRF) y secure en produccion. El token nunca
 * se expone al frontend: el navegador lo envia solo, y el panel no lo lee.
 */
export async function startSession(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload)
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

/** Sesion actual, o null si no hay cookie valida. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export type { SessionPayload }
