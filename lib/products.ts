/**
 * Slug de la seccion de tienda (categoria). Las secciones viven en PostgreSQL
 * y se crean desde el panel, asi que no es una lista cerrada.
 */
export type ProductCategory = string

export const categoryLabels: Record<ProductCategory, string> = {
  camisas: 'Camisas',
  gorras: 'Gorras',
  pines: 'Pines',
}

/**
 * Seccion visible de la tienda. Solo se construyen a partir de categorias con
 * `isVisible = true`, asi que la navegacion publica nunca puede enlazar a una
 * seccion desactivada desde el panel.
 */
export interface StoreSection {
  slug: ProductCategory
  label: string
  href: string
  /** Texto de presentacion editable en el panel. Vacio = texto por defecto. */
  description: string
}

/** Promocion vigente aplicada a un producto, tal como la ve la tienda. */
export interface ProductPromotion {
  name: string
  discountPercent: number
}

/**
 * Producto tal como lo consume la tienda publica.
 *
 * ORIGEN DE LOS DATOS: PostgreSQL. Estos objetos los construye
 * lib/api/public-products.ts a partir de la base de datos, que es la misma
 * fuente que administra el panel. Ya no existe ningun catalogo estatico.
 *
 * `price` es siempre el precio ORIGINAL guardado en la base de datos y nunca se
 * modifica. Cuando hay una promocion vigente, `discountedPrice` trae el precio
 * con el descuento ya calculado por el servidor.
 */
export interface Product {
  id: string
  slug: string
  name: string
  description: string
  /** Precio original. Nunca se modifica, ni siquiera con promociones. */
  price: number
  /** Precio anterior (descuento manual del producto). null si no hay. */
  oldPrice: number | null
  /** Precio con la promocion aplicada. null si no hay promocion vigente. */
  discountedPrice: number | null
  promotion: ProductPromotion | null
  category: ProductCategory
  /** Nombre de la seccion, tal como se llama en el panel. */
  categoryLabel: string
  /** Imagen principal. */
  image: string
  /**
   * Galeria de imagenes, empezando por la principal. Vacia solo cuando el
   * producto tiene video y ninguna imagen.
   */
  images: string[]
  /** Video del producto; se muestra en la galeria junto a las imagenes. */
  video: string | null
  sizes: string[]
  colors: string[]
  details: Record<string, string>
  /**
   * Tipo de gorra (solo productos de gorras con tipo asignado). Con
   * `usesFittedSizes`, `sizes` son tallas cerradas ("7 1/4") y la Guia de
   * tallas filtra por ellas.
   */
  capType: { slug: string; name: string; usesFittedSizes: boolean } | null
  badge?: string
  stock: number
  inStock: boolean
}

/**
 * Precio que realmente paga el cliente: el promocional si hay promocion
 * vigente, y el original si no.
 *
 * Lo usan la tarjeta, el modal y el carrito, de modo que el importe mostrado y
 * el que se envia por WhatsApp salen siempre del mismo sitio.
 */
export function getEffectivePrice(product: Product): number {
  return product.discountedPrice ?? product.price
}

/** true si el producto tiene una promocion vigente aplicada. */
export function hasPromotion(product: Product): boolean {
  return product.promotion !== null && product.discountedPrice !== null
}
