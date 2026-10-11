import { z } from 'zod'

/**
 * Tipos y esquemas del checkout compartidos entre navegador y servidor.
 *
 * Fijate en lo que NO hay en `checkoutItemSchema`: ningun precio. El navegador
 * solo dice que producto, cuantas unidades y que talla/color; el servidor
 * calcula el importe desde PostgreSQL.
 */

export const MAX_QUANTITY_PER_ITEM = 20
export const MAX_ITEMS_PER_ORDER = 30

export const checkoutItemSchema = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
  size: z.string().max(40).optional(),
  color: z.string().max(40).optional(),
})

export const checkoutItemsSchema = z
  .array(checkoutItemSchema)
  .min(1, 'El carrito esta vacio.')
  .max(MAX_ITEMS_PER_ORDER, 'Demasiados productos en un solo pedido.')

export const customerSchema = z.object({
  name: z.string().trim().min(3, 'Escribe tu nombre completo.').max(120),
  email: z.string().trim().email('Correo no valido.').max(160),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{7,20}$/, 'Telefono no valido.'),
  address: z.string().trim().min(5, 'Escribe la direccion de entrega.').max(200),
  city: z.string().trim().min(2, 'Escribe la ciudad.').max(80),
  region: z.string().trim().min(2, 'Escribe el departamento.').max(80),
  notes: z.string().trim().max(500).optional(),
})

export const createCheckoutSchema = z.object({
  items: checkoutItemsSchema,
  customer: customerSchema,
})

export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>
export type CustomerInput = z.infer<typeof customerSchema>

/** Linea del resumen calculada por el servidor. */
export interface QuoteLine {
  productId: string
  name: string
  image: string
  /** Video del producto cuando no tiene imagen: el resumen usa un fotograma. */
  video?: string
  size?: string
  color?: string
  quantity: number
  /** Precio unitario efectivo (con promocion si la hay). */
  unitPrice: number
  lineTotal: number
}

export interface CheckoutQuote {
  lines: QuoteLine[]
  total: number
}

export interface CreateCheckoutResponse {
  reference: string
  total: number
  /** URL del Web Checkout de Wompi, ya firmada. */
  checkoutUrl: string
}

export type PublicPaymentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DECLINED'
  | 'VOIDED'
  | 'ERROR'

export interface PaymentStatusResponse {
  status: PublicPaymentStatus
  reference: string | null
  total: number | null
  paymentMethodType: string | null
}
