import { Prisma, ProductStatus as DbProductStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { SECTION_SLUG_PATTERN } from '@/lib/sections'
import type { Product, ProductCategory, StoreSection } from '@/lib/products'
import type { PublicCapType } from '@/lib/caps/cap-types'
import {
  productInclude,
  toDetailsRecord,
  type ProductWithRelations,
} from './product-dto'
import { loadRunningPromotions } from './promotion-dto'
import {
  applyDiscount,
  resolvePromotionForProduct,
  type PromotionCandidate,
} from './promotion-pricing'

/**
 * Catalogo publico de la tienda, leido de PostgreSQL.
 *
 * ESTE ES EL UNICO CAMINO por el que la tienda publica obtiene productos. Lo
 * usan tanto las paginas de la tienda (server components, sin salto HTTP) como
 * el endpoint GET /api/products, asi que ambos devuelven exactamente lo mismo y
 * no puede haber dos versiones de la verdad.
 *
 * Reglas que aplica:
 *  - Solo productos ACTIVE: desactivar en el panel lo saca de la tienda.
 *  - Solo categorias con isVisible = true: desactivar una seccion de tienda
 *    oculta la categoria entera y todos sus productos.
 *  - El precio original nunca se modifica; el promocional se calcula al leer.
 *  - Las promociones vigentes se resuelven con la regla de prioridad de
 *    promotion-pricing.ts (la especifica gana sobre la global, sin acumular).
 */

function toPublicProduct(
  product: ProductWithRelations,
  runningPromotions: PromotionCandidate[],
): Product {
  const primary = product.images.find((image) => image.isPrimary)
  const gallery = [
    ...(primary ? [primary.url] : []),
    ...product.images.filter((i) => i.id !== primary?.id).map((i) => i.url),
  ]

  const promotion = resolvePromotionForProduct(product.id, runningPromotions)

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: product.price,
    oldPrice: product.oldPrice,
    discountedPrice: promotion
      ? applyDiscount(product.price, promotion.discountPercent)
      : null,
    promotion: promotion
      ? { name: promotion.name, discountPercent: promotion.discountPercent }
      : null,
    category: product.category.slug as ProductCategory,
    categoryLabel: product.category.name,
    // `image` (tarjeta sin video, carrito) cae siempre al placeholder. La
    // galeria solo lo usa si el producto no tiene ni imagenes ni video.
    image: primary?.url ?? '/placeholder.svg',
    images:
      gallery.length > 0 || product.videoUrl ? gallery : ['/placeholder.svg'],
    video: product.videoUrl,
    sizes: product.sizes,
    colors: product.colors,
    details: toDetailsRecord(product.details),
    capType: product.capType,
    badge: product.badge ?? undefined,
    stock: product.stock,
    inStock: product.stock > 0,
  }
}

/**
 * Productos publicos, opcionalmente filtrados por categoria.
 * Una sola consulta de promociones para todo el listado.
 */
export async function loadPublicProducts(
  categorySlug?: string | null,
): Promise<Product[]> {
  // La condicion de visibilidad va SIEMPRE: un producto activo de una seccion
  // desactivada no debe salir por ninguna via.
  const categoryWhere: Prisma.CategoryWhereInput = { isVisible: true }

  if (categorySlug && categorySlug !== 'all') {
    if (!SECTION_SLUG_PATTERN.test(categorySlug)) return []
    categoryWhere.slug = categorySlug
  }

  const where: Prisma.ProductWhereInput = {
    status: DbProductStatus.ACTIVE,
    category: categoryWhere,
  }

  const [products, runningPromotions] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    }),
    loadRunningPromotions(),
  ])

  return products.map((product) => toPublicProduct(product, runningPromotions))
}

/**
 * Secciones que el cliente puede ver, en el orden en que se muestran.
 * De aqui salen los enlaces del menu y las secciones de la portada, asi que la
 * navegacion publica nunca enlaza a una seccion desactivada.
 */
export async function loadVisibleSections(): Promise<StoreSection[]> {
  const categories = await prisma.category.findMany({
    where: { isVisible: true },
    select: { name: true, slug: true, description: true },
    orderBy: { name: 'asc' },
  })

  return categories.map((category) => ({
    slug: category.slug as ProductCategory,
    label: category.name,
    href: `/${category.slug}`,
    description: category.description,
  }))
}

/** true si esa seccion esta visible para los clientes. */
export async function isSectionVisible(slug: string): Promise<boolean> {
  return (await loadVisibleSection(slug)) !== null
}

/**
 * Seccion visible por su slug, con nombre y descripcion, o null si no existe
 * o esta oculta. La usa la pagina publica de cada seccion.
 */
export async function loadVisibleSection(
  slug: string,
): Promise<{ slug: string; name: string; description: string } | null> {
  if (!SECTION_SLUG_PATTERN.test(slug)) return null
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { slug: true, name: true, description: true, isVisible: true },
  })
  if (!category?.isVisible) return null
  return {
    slug: category.slug,
    name: category.name,
    description: category.description,
  }
}

/**
 * Productos destacados desde el panel (estrella), con las mismas reglas que el
 * resto del catalogo publico: solo ACTIVE y de secciones visibles. Orden de la
 * seleccion manual: el ultimo destacado primero (nunca por fecha de creacion).
 */
export async function loadFeaturedProducts(): Promise<Product[]> {
  const [products, runningPromotions] = await Promise.all([
    prisma.product.findMany({
      where: {
        isFeatured: true,
        status: DbProductStatus.ACTIVE,
        category: { isVisible: true },
      },
      include: productInclude,
      orderBy: [{ featuredAt: 'desc' }, { id: 'asc' }],
    }),
    loadRunningPromotions(),
  ])

  return products.map((product) => toPublicProduct(product, runningPromotions))
}

/**
 * Portada: secciones visibles y sus productos DESTACADOS, en una sola pasada
 * por la base de datos. Una seccion desactivada no aparece en el resultado, asi
 * que la portada no la renderiza; una seccion sin destacados llega vacia y la
 * portada muestra su estado vacio.
 */
export async function loadHomeCatalog(): Promise<{
  sections: StoreSection[]
  productsBySlug: Record<string, Product[]>
}> {
  const [sections, all] = await Promise.all([
    loadVisibleSections(),
    loadFeaturedProducts(),
  ])

  const productsBySlug: Record<string, Product[]> = {}
  for (const section of sections) {
    productsBySlug[section.slug] = all.filter(
      (product) => product.category === section.slug,
    )
  }

  return { sections, productsBySlug }
}

/**
 * Tipos de gorra que se ofrecen como filtro en la seccion de gorras: solo los
 * activos. Un tipo desactivado desaparece del filtro aunque alguna gorra lo
 * conserve. Si ninguno activo usa tallas cerradas, la tienda oculta la Guia de
 * tallas.
 */
export async function loadPublicCapTypes(): Promise<PublicCapType[]> {
  return prisma.capType.findMany({
    where: { isActive: true },
    select: { slug: true, name: true, usesFittedSizes: true },
    orderBy: { name: 'asc' },
  })
}
