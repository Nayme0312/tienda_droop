import { ApiError, API_ROUTES, api } from '@/lib/api/client'
import type {
  AdminProduct,
  ProductFilters,
  ProductInput,
  ProductStats,
  ProductStatus,
} from './types'

/**
 * Capa de servicios de productos.
 *
 * ETAPA 2: cada funcion habla con la API, que valida la sesion y escribe en
 * PostgreSQL. Ya no queda nada en memoria ni ningun dato mock.
 *
 * Las firmas son exactamente las mismas que en la etapa 1, que era el objetivo
 * del diseno: ni el provider ni una sola pantalla del panel han tenido que
 * cambiar al sustituir el mock por la base de datos real.
 *
 *   getProducts()          ->  GET    /api/admin/products
 *   getProductById(id)     ->  GET    /api/admin/products/:id
 *   createProduct(input)   ->  POST   /api/admin/products
 *   updateProduct(id, i)   ->  PATCH  /api/admin/products/:id
 *   deleteProduct(id)      ->  DELETE /api/admin/products/:id
 *   toggleProductStatus()  ->  PATCH  /api/admin/products/:id/status
 *   setProductFeatured()   ->  PATCH  /api/admin/products/:id/featured
 *   uploadProductImage(f)  ->  POST   /api/admin/uploads  (imagen o video)
 */

// ---------------------------------------------------------------------------
// Helpers puros (sin red). Los usa la interfaz para filtrar y calcular al
// instante sobre la lista ya cargada, sin volver a pedir datos.
// ---------------------------------------------------------------------------

export function filterProducts(
  products: AdminProduct[],
  filters: ProductFilters = {},
): AdminProduct[] {
  const search = filters.search?.trim().toLowerCase() ?? ''

  return products.filter((product) => {
    if (
      filters.categoryId &&
      filters.categoryId !== 'all' &&
      product.categoryId !== filters.categoryId
    ) {
      return false
    }
    if (
      filters.status &&
      filters.status !== 'all' &&
      product.status !== filters.status
    ) {
      return false
    }
    // Por nombre o por codigo (los codigos se comparan por su comienzo).
    if (
      search &&
      !product.name.toLowerCase().includes(search) &&
      !String(product.code).startsWith(search)
    ) {
      return false
    }
    return true
  })
}

/** Mas recientes primero. */
export function sortByRecent(products: AdminProduct[]): AdminProduct[] {
  return [...products].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

/** Estadisticas del dashboard, derivadas de los productos ya cargados. */
export function computeProductStats(
  products: AdminProduct[],
  categoryCount: number,
): ProductStats {
  return {
    total: products.length,
    active: products.filter((p) => p.status === 'active').length,
    outOfStock: products.filter((p) => p.stock === 0).length,
    categories: categoryCount,
  }
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

function buildQuery(filters?: ProductFilters): string {
  if (!filters) return ''
  const params = new URLSearchParams()
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  if (filters.categoryId && filters.categoryId !== 'all') {
    params.set('category', filters.categoryId)
  }
  if (filters.status && filters.status !== 'all') {
    params.set('status', filters.status)
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function getProducts(
  filters?: ProductFilters,
): Promise<AdminProduct[]> {
  return api.get<AdminProduct[]>(
    `${API_ROUTES.products}${buildQuery(filters)}`,
  )
}

/**
 * Busca en PostgreSQL por nombre o codigo y devuelve como mucho `limit`
 * productos. La usa el buscador de "Registrar venta" para no depender de tener
 * todo el catalogo cargado.
 */
export async function searchProducts(
  search: string,
  limit = 8,
): Promise<AdminProduct[]> {
  const params = new URLSearchParams({ search: search.trim(), limit: String(limit) })
  return api.get<AdminProduct[]>(`${API_ROUTES.products}?${params.toString()}`)
}

/** null si no existe; cualquier otro fallo se propaga. */
export async function getProductById(id: string): Promise<AdminProduct | null> {
  try {
    return await api.get<AdminProduct>(API_ROUTES.product(id))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function createProduct(
  input: ProductInput,
): Promise<AdminProduct> {
  return api.post<AdminProduct>(API_ROUTES.products, input)
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<AdminProduct> {
  return api.patch<AdminProduct>(API_ROUTES.product(id), input)
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete<void>(API_ROUTES.product(id))
}

/**
 * Sin argumento invierte el estado actual en la base de datos; con `status`
 * fija uno concreto.
 */
export async function toggleProductStatus(
  id: string,
  status?: ProductStatus,
): Promise<AdminProduct> {
  return api.patch<AdminProduct>(
    API_ROUTES.productStatus(id),
    status ? { status } : undefined,
  )
}

/** Marca o desmarca el producto como destacado en la portada. */
export async function setProductFeatured(
  id: string,
  featured: boolean,
): Promise<AdminProduct> {
  return api.patch<AdminProduct>(API_ROUTES.productFeatured(id), { featured })
}

/** Sube una imagen y devuelve la URL definitiva con la que se sirve. */
export async function uploadProductImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const { url } = await api.upload<{ url: string }>(API_ROUTES.uploads, form)
  return url
}
