/**
 * Datos de contacto de la tienda.
 *
 * El numero va en formato internacional, solo digitos y sin "+": es lo que
 * exige wa.me (Colombia = 57).
 */
export const WHATSAPP_NUMBER = '573102755204'

export const WHATSAPP_DEFAULT_MESSAGE = '¡Hola! Quisiera más información sobre los productos'

/** Enlace que abre el chat con el mensaje ya escrito (app en movil, web en escritorio). */
export function whatsappUrl(message: string = WHATSAPP_DEFAULT_MESSAGE): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
