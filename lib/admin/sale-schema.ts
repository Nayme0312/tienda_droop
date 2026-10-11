import { z } from 'zod'

/**
 * Validacion de la venta presencial, compartida por el formulario y la API
 * (mismo patron que product-schema.ts). El stock no se puede validar aqui: lo
 * comprueba el servidor dentro de la transaccion que lo descuenta.
 */
export const MANUAL_PAYMENT_METHODS = ['CASH', 'TRANSFER', 'OTHER'] as const

export const manualSaleSchema = z.object({
  productId: z.string().trim().min(1, 'Selecciona un producto').max(100),
  quantity: z
    .number({ invalid_type_error: 'Introduce una cantidad valida' })
    .int('La cantidad debe ser un numero entero')
    .min(1, 'La cantidad debe ser mayor que 0')
    .max(10_000, 'La cantidad es demasiado alta'),
  unitPrice: z
    .number({ invalid_type_error: 'Introduce un precio valido' })
    .int('El precio debe ser un numero entero')
    .positive('El precio debe ser mayor que 0')
    .max(100_000_000, 'El precio es demasiado alto'),
  paymentMethod: z.enum(MANUAL_PAYMENT_METHODS, {
    errorMap: () => ({ message: 'Selecciona un metodo de pago valido' }),
  }),
  customerName: z
    .string()
    .trim()
    .max(120, 'El nombre no puede superar los 120 caracteres')
    .optional(),
  soldAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha valida')
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
      message: 'Selecciona una fecha valida',
    }),
  notes: z
    .string()
    .trim()
    .max(500, 'Las observaciones no pueden superar los 500 caracteres')
    .optional(),
  idempotencyKey: z.string().min(8).max(100),
})

export type ManualSaleSchema = z.infer<typeof manualSaleSchema>
