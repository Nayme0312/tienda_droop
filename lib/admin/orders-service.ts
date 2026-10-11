import { API_ROUTES, api } from '@/lib/api/client'
import type { AdminOrder, OrderFulfillment, OrderPaymentStatus } from './types'

/**
 * Capa de servicios de pedidos. Mismo patron que productos, promociones y
 * secciones.
 *
 *   getOrders(status?)            ->  GET   /api/admin/orders?status=
 *   setFulfillment(id, value)     ->  PATCH /api/admin/orders/:id
 */
export async function getOrders(status?: OrderPaymentStatus): Promise<AdminOrder[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return api.get<AdminOrder[]>(`${API_ROUTES.orders}${query}`)
}

export async function setFulfillment(
  id: string,
  fulfillment: OrderFulfillment,
): Promise<AdminOrder> {
  return api.patch<AdminOrder>(API_ROUTES.order(id), { fulfillment })
}
