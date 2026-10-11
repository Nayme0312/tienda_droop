/**
 * Unico punto por el que el frontend habla con la API.
 *
 * Ningun componente construye URLs ni llama a fetch directamente: todo pasa por
 * aqui, de modo que cabeceras, envio de cookies y tratamiento de errores estan
 * definidos en un solo sitio.
 *
 * Por defecto se usan rutas relativas ("/api/..."), que es lo correcto cuando
 * el panel y la API comparten origen: asi funciona igual en localhost, en un
 * preview y en produccion, sin configurar nada. NEXT_PUBLIC_API_URL solo hace
 * falta si algun dia la API se sirve desde otro dominio.
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '')

export const API_ROUTES = {
  login: '/api/admin/auth/login',
  logout: '/api/admin/auth/logout',
  me: '/api/admin/auth/me',
  products: '/api/admin/products',
  uploads: '/api/admin/uploads',
  product: (id: string) => `/api/admin/products/${encodeURIComponent(id)}`,
  productStatus: (id: string) =>
    `/api/admin/products/${encodeURIComponent(id)}/status`,
  productFeatured: (id: string) =>
    `/api/admin/products/${encodeURIComponent(id)}/featured`,
  categories: '/api/admin/categories',
  category: (slug: string) =>
    `/api/admin/categories/${encodeURIComponent(slug)}`,
  categoryVisibility: (slug: string) =>
    `/api/admin/categories/${encodeURIComponent(slug)}/visibility`,
  capTypes: '/api/admin/cap-types',
  capType: (id: string) => `/api/admin/cap-types/${encodeURIComponent(id)}`,
  specialDates: '/api/admin/special-dates',
  marquee: '/api/admin/marquee',
  hero: '/api/admin/hero',
  specialDate: (slug: string) =>
    `/api/admin/special-dates/${encodeURIComponent(slug)}`,
  promotions: '/api/admin/promotions',
  promotion: (id: string) => `/api/admin/promotions/${encodeURIComponent(id)}`,
  promotionStatus: (id: string) =>
    `/api/admin/promotions/${encodeURIComponent(id)}/status`,
  publicProducts: '/api/products',
  orders: '/api/admin/orders',
  order: (id: string) => `/api/admin/orders/${encodeURIComponent(id)}`,
  sales: '/api/admin/sales',
  analytics: '/api/admin/analytics',
  checkout: '/api/checkout',
  checkoutQuote: '/api/checkout/quote',
  checkoutStatus: (transactionId: string) =>
    `/api/checkout/status?id=${encodeURIComponent(transactionId)}`,
} as const

/** Error de la API con su codigo de estado y, si los hay, errores por campo. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }
}

interface ApiErrorBody {
  error?: string
  fieldErrors?: Record<string, string>
}

function messageForStatus(status: number): string {
  if (status === 401) return 'Tu sesion ha caducado. Vuelve a iniciar sesion.'
  if (status === 403) return 'No tienes permiso para esta accion.'
  if (status === 404) return 'No se ha encontrado el recurso.'
  if (status === 409) return 'Ese registro entra en conflicto con otro.'
  if (status >= 500) return 'Error del servidor. Intentalo de nuevo.'
  return 'La peticion no se ha podido completar.'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      // La cookie de sesion es httpOnly: la envia el navegador, no el codigo.
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        // Con FormData es el navegador quien pone el Content-Type (multipart con
        // su boundary), asi que solo se fija para los cuerpos JSON.
        ...(typeof init?.body === 'string'
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...init?.headers,
      },
    })
  } catch {
    // fetch solo rechaza por fallo de red, no por codigo de estado.
    throw new ApiError(0, 'No se ha podido conectar con el servidor.')
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const body = (data ?? {}) as ApiErrorBody
    throw new ApiError(
      response.status,
      body.error ?? messageForStatus(response.status),
      body.fieldErrors,
    )
  }

  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form }),
}
