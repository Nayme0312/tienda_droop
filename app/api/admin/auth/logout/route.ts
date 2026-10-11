import type { NextRequest } from 'next/server'
import { destroySession } from '@/lib/auth/session'
import { assertSameOrigin, jsonOk, toErrorResponse } from '@/lib/api/http'

/**
 * Cierre de sesion. Es publico a proposito: cerrar sesion sin sesion valida no
 * hace dano y evita que una cookie caducada deje al usuario atrapado.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    await destroySession()
    return jsonOk({ ok: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
