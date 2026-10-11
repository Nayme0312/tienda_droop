import { z } from 'zod'

/**
 * Validacion de promociones, compartida por el formulario y la API, igual que
 * con los productos: el servidor valida con este mismo esquema antes de escribir
 * en PostgreSQL y no da por bueno nada del navegador.
 */

/**
 * Se permite de 1 a 99. Un 100% dejaria el precio en 0, que es un regalo y no un
 * descuento: si algun dia hace falta, sera una funcionalidad aparte.
 */
export const MIN_DISCOUNT = 1
export const MAX_DISCOUNT = 99

const isoDate = z
  .string()
  .min(1, 'La fecha es obligatoria')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Fecha no valida',
  })

const promotionFields = {
  name: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(120, 'El nombre no puede superar los 120 caracteres'),
  discountPercent: z
    .number({ invalid_type_error: 'Introduce un porcentaje valido' })
    .int('El porcentaje debe ser un numero entero')
    .min(MIN_DISCOUNT, `El descuento minimo es ${MIN_DISCOUNT}%`)
    .max(MAX_DISCOUNT, `El descuento maximo es ${MAX_DISCOUNT}%`),
  scope: z.enum(['all', 'selected'], {
    errorMap: () => ({ message: 'Selecciona a que se aplica la promocion' }),
  }),
  startsAt: isoDate,
  endsAt: isoDate,
  isActive: z.boolean(),
  productIds: z.array(z.string().min(1)).max(500, 'Demasiados productos'),
}

export const promotionFieldsSchema = z.object(promotionFields)

/** Reglas que cruzan varios campos. Se aplican al objeto ya completo. */
function refineRules(
  data: {
    scope: 'all' | 'selected'
    startsAt: string
    endsAt: string
    productIds: string[]
  },
  ctx: z.RefinementCtx,
): void {
  if (new Date(data.endsAt).getTime() < new Date(data.startsAt).getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La fecha de fin no puede ser anterior a la de inicio',
      path: ['endsAt'],
    })
  }

  if (data.scope === 'selected' && data.productIds.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecciona al menos un producto',
      path: ['productIds'],
    })
  }
}

export const promotionInputSchema =
  promotionFieldsSchema.superRefine(refineRules)

/**
 * Actualizacion parcial. Las reglas cruzadas no se comprueban aqui porque el
 * cuerpo puede traer solo un campo: el handler las valida tras fusionar con la
 * promocion que ya existe (igual que con el precio anterior de los productos).
 */
export const promotionPatchSchema = promotionFieldsSchema.partial()

export type PromotionInputSchema = z.infer<typeof promotionFieldsSchema>
export type PromotionPatchSchema = z.infer<typeof promotionPatchSchema>

export type PromotionFieldErrors = Partial<
  Record<keyof PromotionInputSchema, string>
>

/** Aplica las reglas cruzadas a una promocion ya fusionada. Devuelve el primer error. */
export function checkPromotionRules(data: {
  scope: 'all' | 'selected'
  startsAt: string
  endsAt: string
  productIds: string[]
}): { field: keyof PromotionInputSchema; message: string } | null {
  if (new Date(data.endsAt).getTime() < new Date(data.startsAt).getTime()) {
    return {
      field: 'endsAt',
      message: 'La fecha de fin no puede ser anterior a la de inicio',
    }
  }
  if (data.scope === 'selected' && data.productIds.length === 0) {
    return { field: 'productIds', message: 'Selecciona al menos un producto' }
  }
  return null
}

/** Valida y devuelve el primer error por campo, para el formulario. */
export function validatePromotionInput(input: unknown):
  | { success: true; data: PromotionInputSchema }
  | { success: false; errors: PromotionFieldErrors } {
  const result = promotionInputSchema.safeParse(input)
  if (result.success) return { success: true, data: result.data }

  const flat = result.error.flatten().fieldErrors
  const errors: PromotionFieldErrors = {}
  for (const [field, messages] of Object.entries(flat)) {
    if (messages && messages.length > 0) {
      errors[field as keyof PromotionInputSchema] = messages[0]
    }
  }
  return { success: false, errors }
}
