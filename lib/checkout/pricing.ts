import { ProductStatus as DbProductStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { badRequest } from '@/lib/api/http'
import { loadRunningPromotions } from '@/lib/api/promotion-dto'
import {
  applyDiscount,
  resolvePromotionForProduct,
} from '@/lib/api/promotion-pricing'
import type { CheckoutItemInput, CheckoutQuote, QuoteLine } from './types'

/**
 * Calcula el pedido EN EL SERVIDOR a partir de PostgreSQL.
 *
 * Aplica exactamente las mismas reglas que la tienda publica
 * (lib/api/public-products.ts): solo productos ACTIVE de secciones visibles, y
 * la promocion vigente segun promotion-pricing.ts. El precio que el navegador
 * tenga guardado en el carrito se ignora por completo.
 *
 * Lanza 400 si algun producto ya no esta disponible, no tiene stock suficiente
 * o la talla/color no existe.
 */
export async function priceCart(items: CheckoutItemInput[]): Promise<CheckoutQuote> {
  const ids = [...new Set(items.map((item) => item.productId))]

  const [products, runningPromotions] = await Promise.all([
    prisma.product.findMany({
      where: {
        id: { in: ids },
        status: DbProductStatus.ACTIVE,
        category: { isVisible: true },
      },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        sizes: true,
        colors: true,
        videoUrl: true,
        images: {
          select: { url: true, isPrimary: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
    loadRunningPromotions(),
  ])

  const byId = new Map(products.map((product) => [product.id, product]))

  // Unidades pedidas por producto (sumando tallas), para validar el stock.
  const requested = new Map<string, number>()
  for (const item of items) {
    requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity)
  }

  const lines: QuoteLine[] = items.map((item) => {
    const product = byId.get(item.productId)
    if (!product) {
      throw badRequest(
        'Uno de los productos del carrito ya no esta disponible. Revisa tu carrito.',
      )
    }
    if ((requested.get(product.id) ?? 0) > product.stock) {
      throw badRequest(
        product.stock > 0
          ? `Solo quedan ${product.stock} unidades de "${product.name}".`
          : `"${product.name}" esta agotado.`,
      )
    }
    if (product.sizes.length > 0 && item.size && !product.sizes.includes(item.size)) {
      throw badRequest(`La talla ${item.size} de "${product.name}" no existe.`)
    }
    if (product.colors.length > 0 && item.color && !product.colors.includes(item.color)) {
      throw badRequest(`El color ${item.color} de "${product.name}" no existe.`)
    }

    const promotion = resolvePromotionForProduct(product.id, runningPromotions)
    const unitPrice = promotion
      ? applyDiscount(product.price, promotion.discountPercent)
      : product.price
    const primary = product.images.find((image) => image.isPrimary) ?? product.images[0]

    return {
      productId: product.id,
      name: product.name,
      image: primary?.url ?? '/placeholder.svg',
      video: !primary && product.videoUrl ? product.videoUrl : undefined,
      size: item.size || undefined,
      color: item.color || undefined,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    }
  })

  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  if (total <= 0) throw badRequest('El total del pedido no es valido.')

  return { lines, total }
}
