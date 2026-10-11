import type { z } from 'zod'
import { badRequest } from './http'

/**
 * Valida con un esquema de zod y, si falla, lanza un HttpError 400 con el
 * primer error de cada campo. El panel muestra esos `fieldErrors` debajo del
 * input correspondiente, igual que la validacion del cliente.
 */
export function parseOrThrow<Schema extends z.ZodTypeAny>(
  schema: Schema,
  data: unknown,
): z.infer<Schema> {
  const result = schema.safeParse(data)
  if (result.success) return result.data

  const flat = result.error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >
  const fieldErrors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(flat)) {
    if (messages && messages.length > 0) fieldErrors[field] = messages[0]
  }

  const formErrors = result.error.flatten().formErrors
  const message =
    formErrors.length > 0 ? formErrors[0] : 'Los datos enviados no son validos.'

  throw badRequest(message, Object.keys(fieldErrors).length ? fieldErrors : undefined)
}
