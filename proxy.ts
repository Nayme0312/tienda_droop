import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/jwt'
import { ADMIN_BASE_PATH } from '@/lib/admin/routes'

/**
 * Primera barrera de proteccion del panel y de la API administrativa.
 *
 * (En Next 16 este fichero se llama `proxy.ts`: es el nuevo nombre de lo que
 * antes era `middleware.ts`, con la misma API.)
 *
 * Corre en el runtime Edge, por eso solo importa `jose` y constantes: nada de
 * Prisma ni de `next/headers`. Y es solo la PRIMERA de tres barreras:
 *   1. aqui, antes de llegar a la aplicacion,
 *   2. en el layout del grupo (panel), en el servidor,
 *   3. en cada route handler, con `requireAdmin()`.
 * La seguridad real esta en la 3: no depende de que este fichero se ejecute.
 */
const LOGIN_PATH = `${ADMIN_BASE_PATH}/login`

/** Endpoints de la API administrativa que tienen que ser publicos. */
const PUBLIC_API_PATHS = new Set([
  '/api/admin/auth/login',
  '/api/admin/auth/logout',
])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  // --- API administrativa: responde JSON, nunca redirige ---
  if (pathname.startsWith('/api/admin/')) {
    if (PUBLIC_API_PATHS.has(pathname)) return NextResponse.next()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // --- Login: si ya hay sesion, no tiene sentido mostrarlo ---
  if (pathname === LOGIN_PATH) {
    if (session) {
      return NextResponse.redirect(new URL(ADMIN_BASE_PATH, request.url))
    }
    return NextResponse.next()
  }

  // --- Resto del panel: exige sesion ---
  if (pathname === ADMIN_BASE_PATH || pathname.startsWith(`${ADMIN_BASE_PATH}/`)) {
    if (!session) {
      const loginUrl = new URL(LOGIN_PATH, request.url)
      // Se recuerda a donde queria entrar para volver alli tras el login.
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

// Next exige rutas literales en el matcher: no admite variables, asi que el
// segmento del panel aparece escrito aqui y en ADMIN_BASE_PATH. Si cambia, hay
// que actualizar ambos sitios (y renombrar la carpeta en app/).
export const config = {
  matcher: ['/streepanel-84m2', '/streepanel-84m2/:path*', '/api/admin/:path*'],
}
