import { randomBytes } from 'node:crypto'
import { PaymentStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getWompiConfig } from '@/lib/wompi/config'
import { integritySignature } from '@/lib/wompi/signature'
import type { WompiTransaction } from '@/lib/wompi/client'
import type { CheckoutQuote, CustomerInput } from './types'

const CURRENCY = 'COP'

/** Referencia unica y no adivinable, p. ej. "SV-MG3K2Q1-9F4A7C21". */
function newReference(): string {
  return `SV-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`
}

/**
 * Crea el pedido en estado PENDING con el total calculado por el servidor y
 * devuelve la URL firmada del Web Checkout de Wompi.
 *
 * El pedido se guarda ANTES de pagar para que el importe quede fijado en la base
 * de datos: cuando Wompi confirme el pago, se compara contra este valor y no
 * contra nada que venga del navegador.
 */
export async function createPendingOrder(
  quote: CheckoutQuote,
  customer: CustomerInput,
  redirectUrl: string,
): Promise<{ reference: string; checkoutUrl: string }> {
  const config = getWompiConfig()
  const reference = newReference()
  const amountInCents = quote.total * 100

  await prisma.order.create({
    data: {
      reference,
      total: quote.total,
      amountInCents,
      currency: CURRENCY,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      address: customer.address,
      city: customer.city,
      region: customer.region,
      notes: customer.notes || null,
      items: {
        create: quote.lines.map((line) => ({
          productId: line.productId,
          productName: line.name,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          size: line.size ?? null,
          color: line.color ?? null,
        })),
      },
    },
  })

  const params = new URLSearchParams({
    'public-key': config.publicKey,
    currency: CURRENCY,
    'amount-in-cents': String(amountInCents),
    reference,
    'signature:integrity': integritySignature(
      reference,
      amountInCents,
      CURRENCY,
      config.integritySecret,
    ),
    'redirect-url': redirectUrl,
    'customer-data:email': customer.email,
    'customer-data:full-name': customer.name,
  })

  return { reference, checkoutUrl: `${config.checkoutUrl}?${params.toString()}` }
}

/**
 * Aplica al pedido el estado de una transaccion de Wompi. La usan tanto el
 * webhook como la pagina de resultado, y es idempotente: recibir el mismo
 * evento dos veces (Wompi reintenta) no duplica nada.
 *
 * Reglas:
 *  - El pago solo se aprueba si monto y moneda coinciden EXACTAMENTE con lo
 *    guardado al crear el pedido. Si no, queda en ERROR.
 *  - Un pedido APPROVED no retrocede a PENDING/DECLINED/ERROR; solo puede pasar
 *    a VOIDED (anulacion).
 *  - El paso a APPROVED se hace con un update condicional dentro de una
 *    transaccion: aunque webhook y pagina de resultado lleguen a la vez, el
 *    stock se descuenta una sola vez.
 *
 * Devuelve el pedido actualizado, o null si la referencia no es de esta tienda.
 */
export async function applyWompiTransaction(tx: WompiTransaction) {
  const order = await prisma.order.findUnique({
    where: { reference: tx.reference },
    include: { items: true },
  })
  if (!order) return null

  const amountMatches =
    tx.amount_in_cents === order.amountInCents && tx.currency === order.currency

  if (order.paymentStatus === PaymentStatus.APPROVED) {
    if (tx.status === 'VOIDED' && tx.id === order.wompiTransactionId) {
      return prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.VOIDED, statusMessage: tx.status_message },
      })
    }
    return order
  }

  if (!amountMatches) {
    console.error(
      `[wompi] monto no coincide en ${order.reference}: esperado ${order.amountInCents} ${order.currency}, recibido ${tx.amount_in_cents} ${tx.currency}`,
    )
    return prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatus.ERROR,
        wompiTransactionId: tx.id,
        paymentMethodType: tx.payment_method_type,
        statusMessage: 'El monto pagado no coincide con el pedido.',
      },
    })
  }

  const common = {
    wompiTransactionId: tx.id,
    paymentMethodType: tx.payment_method_type,
    statusMessage: tx.status_message,
  }

  if (tx.status !== 'APPROVED') {
    return prisma.order.update({
      where: { id: order.id },
      data: { ...common, paymentStatus: PaymentStatus[tx.status] },
    })
  }

  return prisma.$transaction(async (db) => {
    const { count } = await db.order.updateMany({
      where: { id: order.id, paymentStatus: { not: PaymentStatus.APPROVED } },
      data: { ...common, paymentStatus: PaymentStatus.APPROVED, paidAt: new Date() },
    })

    // count === 0: otra peticion ya lo aprobo y desconto el stock.
    if (count === 1) {
      for (const item of order.items) {
        if (!item.productId) continue
        const updated = await db.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        })
        if (updated.count === 0) {
          // El pago ya esta hecho: se registra igual y se deja el stock en 0
          // para que el panel lo refleje. Se avisa en el log para revisarlo.
          console.warn(
            `[wompi] stock insuficiente al aprobar ${order.reference} (${item.productName}).`,
          )
          await db.product.updateMany({
            where: { id: item.productId },
            data: { stock: 0 },
          })
        }
      }
    }

    return db.order.findUniqueOrThrow({ where: { id: order.id } })
  })
}
