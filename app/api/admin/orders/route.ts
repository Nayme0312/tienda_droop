import type { NextRequest } from 'next/server'
import { PaymentStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { jsonOk, requireAdmin, toErrorResponse } from '@/lib/api/http'
import { orderInclude, toAdminOrder } from '@/lib/api/order-dto'

const STATUSES = new Set<string>(Object.values(PaymentStatus))

/**
 * GET /api/admin/orders?status=APPROVED — pedidos de Wompi, mas recientes
 * primero. Sin `status` devuelve todos (incluidos los pendientes y rechazados,
 * utiles para atender a un cliente que dice haber pagado).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const status = request.nextUrl.searchParams.get('status')
    const orders = await prisma.order.findMany({
      where: status && STATUSES.has(status) ? { paymentStatus: status as PaymentStatus } : {},
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return jsonOk(orders.map(toAdminOrder))
  } catch (error) {
    return toErrorResponse(error)
  }
}
