import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import {
  assertSameOrigin,
  jsonOk,
  notFound,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import { productInclude, toAdminProduct } from '@/lib/api/product-dto'
import { loadRunningPromotions } from '@/lib/api/promotion-dto'

const featuredSchema = z.object({ featured: z.boolean() })

/**
 * PATCH /api/admin/products/:id/featured   { "featured": true | false }
 *
 * Marca o desmarca el producto como destacado en la portada (estrella del
 * listado del panel). El valor es explicito, no se alterna: dos clics rapidos
 * no pueden dejar el estado contrario al que muestra la estrella.
 * `featuredAt` guarda cuando se destaco, para ordenar los destacados.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request)
    await requireAdmin()
    const { id } = await params

    let body: unknown = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const { featured } = parseOrThrow(featuredSchema, body)

    const current = await prisma.product.findUnique({
      where: { id },
      select: { isFeatured: true },
    })
    if (!current) throw notFound('Producto no encontrado.')

    const updated = await prisma.product.update({
      where: { id },
      data: {
        isFeatured: featured,
        // Volver a marcar un producto ya destacado no cambia su posicion
        ...(featured !== current.isFeatured && {
          featuredAt: featured ? new Date() : null,
        }),
      },
      include: productInclude,
    })

    return jsonOk(toAdminProduct(updated, await loadRunningPromotions()))
  } catch (error) {
    return toErrorResponse(error)
  }
}
