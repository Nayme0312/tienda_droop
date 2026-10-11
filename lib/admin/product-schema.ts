import { z } from 'zod'

/**
 * Validacion del producto, compartida por el formulario y la API.
 *
 * El esquema trabaja sobre el modelo de dominio (numeros ya convertidos), no
 * sobre los strings del formulario, precisamente para poder reutilizarse tal
 * cual en el servidor: los route handlers validan con el MISMO esquema antes de
 * escribir en PostgreSQL, sin confiar en lo que haya hecho el navegador.
 */
const productFields = {
  name: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(120, 'El nombre no puede superar los 120 caracteres'),
  description: z
    .string()
    .trim()
    .max(2000, 'La descripcion no puede superar los 2000 caracteres'),
  price: z
    .number({ invalid_type_error: 'Introduce un precio valido' })
    .int('El precio debe ser un numero entero')
    .positive('El precio debe ser mayor que 0')
    .max(1_000_000_000, 'El precio es demasiado alto'),
  oldPrice: z
    .number({ invalid_type_error: 'Introduce un precio anterior valido' })
    .int('El precio anterior debe ser un numero entero')
    .positive('El precio anterior debe ser mayor que 0')
    .max(1_000_000_000, 'El precio anterior es demasiado alto')
    .nullable(),
  // Slug de la categoria. Las categorias viven en PostgreSQL: que exista lo
  // comprueba la API al guardar.
  categoryId: z
    .string({ invalid_type_error: 'Selecciona una categoria valida' })
    .trim()
    .min(1, 'Selecciona una categoria'),
  stock: z
    .number({ invalid_type_error: 'Introduce un stock valido' })
    .int('El stock debe ser un numero entero')
    .min(0, 'El stock no puede ser negativo')
    .max(1_000_000, 'El stock es demasiado alto'),
  status: z.enum(['active', 'inactive'], {
    errorMap: () => ({ message: 'Estado no valido' }),
  }),
  // La imagen principal puede ir vacia si el producto tiene video: la regla
  // "imagen o video" se comprueba en mediaRule, sobre el producto completo.
  mainImage: z.string(),
  images: z.array(z.string()).max(12, 'Demasiadas imagenes adicionales'),
  /** URL del video (ya subido). null = producto sin video. */
  video: z
    .string()
    .trim()
    .min(1)
    .max(500, 'La URL del video es demasiado larga')
    .nullable()
    .default(null),
  // Los cuatro campos de presentacion llevan valor por defecto: son opcionales
  // al crear (un producto sin tallas ni ficha tecnica es valido) y asi la API
  // no obliga a enviarlos.
  sizes: z
    .array(z.string().trim().min(1).max(20))
    .max(20, 'Demasiadas tallas')
    .default([]),
  colors: z
    .array(z.string().trim().min(1).max(40))
    .max(20, 'Demasiados colores')
    .default([]),
  badge: z
    .string()
    .trim()
    .max(30, 'La etiqueta no puede superar los 30 caracteres')
    .nullable()
    .default(null),
  details: z
    .record(z.string(), z.string().trim().max(200))
    .refine((value) => Object.keys(value).length <= 30, {
      message: 'Demasiadas filas en la ficha tecnica',
    })
    .default({}),
  // Id del tipo de gorra. Que exista, este activo y que el producto sea una
  // gorra lo comprueba la API al guardar.
  capTypeId: z.string().trim().min(1).max(40).nullable().default(null),
}

/** Objeto sin refinamientos: hace falta para poder derivar `.partial()`. */
export const productFieldsSchema = z.object(productFields)

const oldPriceRule = {
  message: 'El precio anterior debe ser mayor que el precio actual',
  path: ['oldPrice'],
}

/**
 * Imagenes y video son independientes: vale solo imagenes, solo video o ambos,
 * pero no ninguno. Las imagenes adicionales cuelgan de la principal, asi que
 * no se admiten sin ella. Devuelve el mensaje de error o null.
 */
export function checkMediaRule(data: {
  mainImage: string
  images: string[]
  video: string | null
}): string | null {
  const hasMain = data.mainImage.trim() !== ''
  if (!hasMain && data.images.length > 0) {
    return 'Elige una imagen principal para las imagenes adicionales'
  }
  if (!hasMain && !data.video) {
    return 'Sube una imagen principal o un video'
  }
  return null
}

/** Creacion: todos los campos obligatorios. */
export const productInputSchema = productFieldsSchema
  .refine(
    (data) => data.oldPrice === null || data.oldPrice > data.price,
    oldPriceRule,
  )
  .superRefine((data, ctx) => {
    const message = checkMediaRule(data)
    if (message) {
      ctx.addIssue({ code: 'custom', message, path: ['mainImage'] })
    }
  })

/**
 * Actualizacion parcial (PATCH). Las reglas de precio anterior y de
 * imagen/video no se pueden comprobar aqui porque puede llegar solo parte de
 * los campos: el handler las valida despues de fusionar con el producto que ya
 * existe en la base de datos.
 */
export const productPatchSchema = productFieldsSchema.partial()

export type ProductInputSchema = z.infer<typeof productFieldsSchema>
export type ProductPatchSchema = z.infer<typeof productPatchSchema>

/** Errores por campo, tal como los consume el formulario. */
export type ProductFieldErrors = Partial<
  Record<keyof ProductInputSchema, string>
>

/** Aplica la regla precio anterior > precio a un producto ya fusionado. */
export function checkOldPriceRule(data: {
  price: number
  oldPrice: number | null
}): string | null {
  if (data.oldPrice !== null && data.oldPrice <= data.price) {
    return oldPriceRule.message
  }
  return null
}

/**
 * Valida y devuelve el primer error de cada campo (es lo que se muestra
 * debajo del input correspondiente en el formulario).
 */
export function validateProductInput(input: unknown):
  | { success: true; data: ProductInputSchema }
  | { success: false; errors: ProductFieldErrors } {
  const result = productInputSchema.safeParse(input)
  if (result.success) return { success: true, data: result.data }

  const flat = result.error.flatten().fieldErrors
  const errors: ProductFieldErrors = {}
  for (const [field, messages] of Object.entries(flat)) {
    if (messages && messages.length > 0) {
      errors[field as keyof ProductInputSchema] = messages[0]
    }
  }
  return { success: false, errors }
}
