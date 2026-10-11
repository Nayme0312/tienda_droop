/** Id de la unica fila de la tabla store_marquee. */
export const MARQUEE_ID = 'main'

/** Longitud maxima del texto de la cinta. */
export const MARQUEE_MAX_LENGTH = 500

/**
 * Divide el texto de la cinta en frases. El administrador las separa con "·"
 * y la tienda pinta entre ellas el separador de la cinta.
 */
export function splitMarqueeText(text: string): string[] {
  return text
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean)
}
