import { randomBytes } from 'node:crypto'
import {
  FulfillmentStatus,
  PaymentStatus,
  Prisma,
  SaleChannel,
} from '@prisma/client'
import { prisma } from '@/lib/db'
import { badRequest, conflict, notFound } from '@/lib/api/http'
import { orderInclude, type OrderWithItems } from '@/lib/api/order-dto'
import type { ManualSaleSchema } from '@/lib/admin/sale-schema'
import { dayKey, startOfDay } from './bogota-time'

const CURRENCY = 'COP'
/** `orders.total * 100` tiene que caber en un INTEGER de PostgreSQL. */
const MAX_TOTAL = 20_000_000

/** Referencia de venta presencial, p. ej. "VP-MG3K2Q1-9F4A7C21". */
function newReference(): string {
  return `VP-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`
}

/**
 * Instante de la venta. Si es de hoy se guarda la hora real; si se registra con
 * fecha pasada, el mediodia de ese dia en Colombia.
 */
function saleInstant(soldAt: string, now: Date): Date {
  if (soldAt === dayKey(now)) return now
  return new Date(startOfDay(soldAt).getTime() + 12 * 60 * 60 * 1000)
}

/**
 * Registra una venta presencial: crea el pedido ya pagado (APPROVED, canal
 * IN_PERSON) y descuenta el stock del producto EN LA MISMA TRANSACCION.
 *
 *  - El descuento es un update condicional (`stock >= cantidad`): si dos ventas
 *    compiten por las ultimas unidades, solo una pasa y la otra recibe un 409.
 *  - `idempotencyKey` es unica en la base de datos: si el formulario envia dos
 *    veces la misma venta, la segunda devuelve la ya registrada y el stock se
 *    descuenta una sola vez.
 *
 * Reutiliza las tablas de pedidos, asi que la venta entra en las analiticas por
 * el mismo camino que un pedido de Wompi aprobado.
 */
export async function createManualSale(
  input: ManualSaleSchema,
): Promise<{ order: OrderWithItems; created: boolean }> {
  const now = new Date()
  if (input.soldAt > dayKey(now)) {
    throw badRequest('La fecha de la venta no puede ser futura.', {
      soldAt: 'La fecha no puede ser futura',
    })
  }

  const total = input.unitPrice * input.quantity
  if (total > MAX_TOTAL) {
    throw badRequest('El total de la venta es demasiado alto.', {
      unitPrice: 'El total de la venta es demasiado alto',
    })
  }

  const findExisting = () =>
    prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: orderInclude,
    })

  const existing = await findExisting()
  if (existing) return { order: existing, created: false }

  const paidAt = saleInstant(input.soldAt, now)

  try {
    const order = await prisma.$transaction(async (db) => {
      const product = await db.product.findUnique({
        where: { id: input.productId },
        select: { id: true, name: true, stock: true },
      })
      if (!product) throw notFound('El producto ya no existe.')

      const updated = await db.product.updateMany({
        where: { id: product.id, stock: { gte: input.quantity } },
        data: { stock: { decrement: input.quantity } },
      })
      if (updated.count === 0) {
        throw conflict(
          product.stock > 0
            ? `Solo quedan ${product.stock} unidades de "${product.name}".`
            : `"${product.name}" esta agotado.`,
        )
      }

      return db.order.create({
        data: {
          reference: newReference(),
          channel: SaleChannel.IN_PERSON,
          paymentMethod: input.paymentMethod,
          paymentStatus: PaymentStatus.APPROVED,
          // Se entrega en mano: no hay nada que preparar ni enviar.
          fulfillment: FulfillmentStatus.DELIVERED,
          idempotencyKey: input.idempotencyKey,
          total,
          amountInCents: total * 100,
          currency: CURRENCY,
          customerName: input.customerName ?? '',
          customerEmail: '',
          customerPhone: '',
          address: '',
          city: '',
          region: '',
          notes: input.notes || null,
          paidAt,
          items: {
            create: {
              productId: product.id,
              productName: product.name,
              unitPrice: input.unitPrice,
              quantity: input.quantity,
            },
          },
        },
        include: orderInclude,
      })
    })

    return { order, created: true }
  } catch (error) {
    // Dos envios simultaneos de la misma venta: gana uno, y la transaccion del
    // otro se revierte entera (stock incluido) por la restriccion unica.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const winner = await findExisting()
      if (winner) return { order: winner, created: false }
    }
    throw error
  }
}
