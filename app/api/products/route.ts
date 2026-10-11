import type { NextRequest } from 'next/server'
import { jsonOk, toErrorResponse } from '@/lib/api/http'
import { loadPublicProducts } from '@/lib/api/public-products'

/**
 * GET /api/products — endpoint PUBLICO de solo lectura.
 *
 * Devuelve unicamente productos ACTIVE, con el precio promocional ya calculado.
 * Usa exactamente el mismo cargador que las paginas de la tienda
 * (lib/api/public-products.ts), asi que no puede desincronizarse de lo que ven
 * los usuarios.
 */
export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category')
    return jsonOk(await loadPublicProducts(category))
  } catch (error) {
    return toErrorResponse(error)
  }
}
