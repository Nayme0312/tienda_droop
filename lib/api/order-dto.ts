import type { Prisma } from '@prisma/client'
import type { AdminOrder } from '@/lib/admin/types'

export const orderInclude = {
  items: { orderBy: { productName: 'asc' } },
} satisfies Prisma.OrderInclude

export type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>

export function toAdminOrder(order: OrderWithItems): AdminOrder {
  return {
    id: order.id,
    reference: order.reference,
    channel: order.channel,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    fulfillment: order.fulfillment,
    total: order.total,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    address: order.address,
    city: order.city,
    region: order.region,
    notes: order.notes,
    wompiTransactionId: order.wompiTransactionId,
    paymentMethodType: order.paymentMethodType,
    statusMessage: order.statusMessage,
    paidAt: order.paidAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
    })),
  }
}
