import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { ProductStatus as DbProductStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  assertSameOrigin,
  jsonOk,
  notFound,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import {
  productInclude,
  toAdminProduct,
  toDbStatus,
} from '@/lib/api/product-dto'
import { loadRunningPromotions } from '@/lib/api/promotion-dto'

/** Cuerpo opcional: sin el, el endpoint invierte el estado actual. */
const statusSchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
})

/**
 * PATCH /api/admin/products/:id/status
 *
 * Cambia ACTIVE <-> INACTIVE en PostgreSQL. Acepta un estado explicito o, si no
 * se envia ninguno, alterna el que tenga el producto.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request)
    await requireAdmin()
    const { id } = await params

    // El cuerpo puede venir vacio: en ese caso se alterna.
    let body: unknown = {}
    try {
      const text = await request.text()
      if (text.trim()) body = JSON.parse(text)
    } catch {
      body = {}
    }
    const { status } = parseOrThrow(statusSchema, body)

    const current = await prisma.product.findUnique({
      where: { id },
      select: { status: true },
    })
    if (!current) throw notFound('Producto no encontrado.')

    const nextStatus = status
      ? toDbStatus(status)
      : current.status === DbProductStatus.ACTIVE
        ? DbProductStatus.INACTIVE
        : DbProductStatus.ACTIVE

    const updated = await prisma.product.update({
      where: { id },
      data: { status: nextStatus },
      include: productInclude,
    })

    return jsonOk(toAdminProduct(updated, await loadRunningPromotions()))
  } catch (error) {
    return toErrorResponse(error)
  }
}
