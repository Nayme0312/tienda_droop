import { Prisma, ProductStatus as DbProductStatus } from '@prisma/client'
import type { CategoryId } from '@/lib/admin/categories'
import type { AdminProduct, ProductStatus } from '@/lib/admin/types'
import {
  applyDiscount,
  resolvePromotionForProduct,
  type PromotionCandidate,
} from './promotion-pricing'

/**
 * Traduccion entre las filas de PostgreSQL y el DTO que consume el panel.
 *
 * DECISION IMPORTANTE: en el DTO, `categoryId` es el SLUG de la categoria
 * ("camisas"), no su id de base de datos (un cuid). En la base de datos la
 * relacion es correcta y normalizada (Product.categoryId -> Category.id), pero
 * hacia fuera se expone el slug porque es estable, legible, coincide con las
 * URLs de la tienda y permitio conectar la API sin tocar ni un tipo ni un
 * componente del panel de la etapa 1.
 */

/**
 * Convierte el campo Json `details` en un mapa de strings seguro.
 * La comparten el DTO del panel y el de la tienda publica.
 */
export function toDetailsRecord(
  value: Prisma.JsonValue | null,
): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'string') result[key] = raw
    else if (typeof raw === 'number' || typeof raw === 'boolean') {
      result[key] = String(raw)
    }
  }
  return result
}

/** Relaciones que necesita el DTO. Imagen principal primero. */
export const productInclude = {
  category: { select: { slug: true, name: true } },
  capType: { select: { slug: true, name: true, usesFittedSizes: true } },
  images: {
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.ProductInclude

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude
}>

export function toProductStatus(status: DbProductStatus): ProductStatus {
  return status === DbProductStatus.ACTIVE ? 'active' : 'inactive'
}

export function toDbStatus(status: ProductStatus): DbProductStatus {
  return status === 'active' ? DbProductStatus.ACTIVE : DbProductStatus.INACTIVE
}

/**
 * Fila de producto -> DTO del panel.
 *
 * `runningPromotions` son las promociones vigentes AHORA (se cargan una sola vez
 * por peticion con `loadRunningPromotions`). De ahi salen los campos calculados
 * `promotion` y `discountedPrice`: el `price` original se devuelve siempre
 * intacto, nunca sobreescrito.
 */
export function toAdminProduct(
  product: ProductWithRelations,
  runningPromotions: PromotionCandidate[] = [],
): AdminProduct {
  const primary = product.images.find((image) => image.isPrimary)
  const extras = product.images.filter((image) => image.id !== primary?.id)

  const promotion = resolvePromotionForProduct(product.id, runningPromotions)

  return {
    id: product.id,
    code: product.code,
    name: product.name,
    description: product.description,
    price: product.price,
    oldPrice: product.oldPrice,
    categoryId: product.category.slug as CategoryId,
    stock: product.stock,
    status: toProductStatus(product.status),
    // Sin imagen principal (producto solo con video) se devuelve "": el
    // formulario no debe cargar el placeholder como si fuera una imagen real.
    // Los listados del panel ponen el placeholder al pintar.
    mainImage: primary?.url ?? '',
    images: extras.map((image) => image.url),
    video: product.videoUrl,
    sizes: product.sizes,
    colors: product.colors,
    badge: product.badge,
    details: toDetailsRecord(product.details),
    capTypeId: product.capTypeId,
    isFeatured: product.isFeatured,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    promotion,
    discountedPrice: promotion
      ? applyDiscount(product.price, promotion.discountPercent)
      : null,
  }
}

export const PLACEHOLDER_IMAGE = '/placeholder.svg'

/**
 * Normaliza una URL de imagen antes de guardarla.
 *
 * El selector de imagenes de la etapa 1 produce URLs `blob:` que solo existen
 * dentro de la pestana del navegador que las creo. Guardarlas en PostgreSQL
 * dejaria filas que no resuelven para nadie, asi que se sustituyen por el
 * placeholder del proyecto. En la etapa 3, cuando exista almacenamiento real,
 * el formulario subira el archivo y aqui llegara ya una URL definitiva.
 */
export function sanitizeImageUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return PLACEHOLDER_IMAGE
  if (trimmed.startsWith('/')) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return PLACEHOLDER_IMAGE
}

/**
 * Normaliza la URL del video antes de guardarla. A diferencia de las imagenes
 * no hay placeholder: una URL que no resuelve (p. ej. un blob: temporal) se
 * guarda como "sin video".
 */
export function sanitizeVideoUrl(url: string | null): string | null {
  const trimmed = url?.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('/')) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return null
}

/** "Camisa Chaos" -> "camisa-chaos" */
export function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'producto'
}

/**
 * Filas de ProductImage a partir de la imagen principal y las adicionales.
 * Se usa tanto al crear como al reemplazar el conjunto de imagenes al editar.
 * Sin imagen principal (producto solo con video) no se crea ninguna fila.
 */
export function buildImageRows(
  mainImage: string,
  images: string[],
  alt: string,
): { url: string; alt: string; isPrimary: boolean; sortOrder: number }[] {
  if (mainImage.trim() === '') return []
  return [
    { url: sanitizeImageUrl(mainImage), alt, isPrimary: true, sortOrder: 0 },
    ...images.map((url, index) => ({
      url: sanitizeImageUrl(url),
      alt,
      isPrimary: false,
      sortOrder: index + 1,
    })),
  ]
}
