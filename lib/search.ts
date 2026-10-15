/**
 * Busqueda de productos por palabras, compartida por la tienda, el panel y la
 * API (lib/api/product-search.ts aplica las mismas reglas en PostgreSQL).
 *
 * Pensada para pegar el texto de un pedido de WhatsApp ("Gorra Classic Navy",
 * "- Camisa Urban M Negro x2"):
 *  - Sin distinguir mayusculas ni tildes ("clasica" encuentra "clásica").
 *  - Cada palabra se busca por separado, asi que da igual el orden o que haya
 *    espacios de mas en el nombre.
 *  - Todas las palabras deben aparecer (Y), pero cada una puede estar en
 *    cualquier campo: nombre, descripcion, colores o tallas. Asi "Navy" se
 *    encuentra en los colores aunque no forme parte del nombre. Con O, "Gorra
 *    Classic Navy" devolveria todas las gorras y todo lo que fuera Navy.
 *  - Una palabra de solo digitos tambien encuentra los codigos que empiezan
 *    por ella (1007).
 */

/** Palabras del mensaje de WhatsApp que no describen el producto. */
const IGNORED_WORDS = new Set(['talla', 'color', 'ref'])

/** Como mucho se usan estas palabras: el resto se ignora. */
export const MAX_SEARCH_TOKENS = 10

/** Minusculas y sin tildes: "Clásica" -> "clasica", "Ñ" -> "n". */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Palabras de la busqueda, ya normalizadas. Descarta los signos sueltos ("-",
 * ":", "•"), la cantidad del pedido ("x2") y las etiquetas "Talla:", "Color:"
 * y "(Ref: 1001)" (de la referencia se queda solo el numero).
 */
export function searchTokens(search: string): string[] {
  return normalizeSearchText(search)
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
    .filter((word) => word !== '' && !/^x\d+$/.test(word) && !IGNORED_WORDS.has(word))
    .slice(0, MAX_SEARCH_TOKENS)
}

export interface SearchableProduct {
  name: string
  description: string
  colors: string[]
  sizes: string[]
  code?: number
}

/** true si el producto contiene todas las palabras. Sin palabras, todo coincide. */
export function matchesSearch(product: SearchableProduct, tokens: string[]): boolean {
  if (tokens.length === 0) return true
  const text = normalizeSearchText(
    [product.name, product.description, ...product.colors, ...product.sizes].join(' '),
  )
  const code = product.code === undefined ? null : String(product.code)
  return tokens.every(
    (token) =>
      text.includes(token) || (code !== null && /^\d+$/.test(token) && code.startsWith(token)),
  )
}
