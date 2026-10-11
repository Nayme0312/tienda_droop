import type { CategoryId } from './categories'
import type { SeasonSlug } from '@/lib/seasons/registry'

export type ProductStatus = 'active' | 'inactive'

/**
 * Modelo de producto del panel.
 *
 * Los nombres y tipos estan pensados para mapear 1:1 con la tabla de
 * PostgreSQL de la siguiente etapa, por eso las fechas son strings ISO
 * (lo que devolvera la API) y no objetos Date.
 */
export interface AdminProduct {
  id: string
  /**
   * Codigo numerico unico (1000, 1001...). Lo asigna PostgreSQL al crear el
   * producto y no cambia nunca: es de solo lectura en todo el panel.
   */
  code: number
  name: string
  description: string
  price: number
  /** Precio antes del descuento. null = sin descuento. */
  oldPrice: number | null
  categoryId: CategoryId
  stock: number
  status: ProductStatus
  /** URL de la imagen principal. "" si el producto solo tiene video. */
  mainImage: string
  /** URLs de las imagenes adicionales. */
  images: string[]
  /** URL del video del producto. null = sin video. */
  video: string | null
  /** Tallas disponibles. Vacio en productos sin talla (gorras, pines). */
  sizes: string[]
  colors: string[]
  /** Etiqueta destacada que muestra la tienda: "Nuevo", "Popular"... */
  badge: string | null
  /** Ficha tecnica que la tienda lista en el modal del producto. */
  details: Record<string, string>
  /** Id del tipo de gorra. Solo en productos de la seccion gorras; null si no. */
  capTypeId: string | null
  /** Destacado en la portada (estrella del listado). */
  isFeatured: boolean
  createdAt: string
  updatedAt: string
  /**
   * Promocion vigente que le aplica, o null. La resuelve el servidor aplicando
   * la regla de prioridad (ver lib/api/promotion-pricing.ts).
   */
  promotion: AppliedPromotion | null
  /**
   * Precio con el descuento aplicado, o null si no hay promocion vigente.
   * Es un valor CALCULADO: `price` nunca se modifica.
   */
  discountedPrice: number | null
}

/**
 * Lo que el formulario envia al crear o actualizar.
 *
 * Se excluyen `promotion` y `discountedPrice` porque son campos derivados que
 * calcula el servidor: el formulario de producto no los envia ni los edita.
 * `code` tampoco: lo genera la base de datos.
 */
/** `isFeatured` no va en el formulario: solo lo cambia la estrella del listado. */
export type ProductInput = Omit<
  AdminProduct,
  | 'id'
  | 'code'
  | 'createdAt'
  | 'updatedAt'
  | 'promotion'
  | 'discountedPrice'
  | 'isFeatured'
>

/**
 * Imagen en el formulario, antes de existir almacenamiento real.
 *
 * `url` es lo unico que se guarda en el modelo. Puede ser:
 *  - una ruta del proyecto, p. ej. "/images/camisa-chaos.jpg"
 *  - un blob: temporal creado con URL.createObjectURL para la previsualizacion
 *
 * `file` solo esta presente cuando el usuario acaba de elegir el archivo en
 * esta sesion. En la etapa de backend ese File es exactamente lo que habra
 * que subir al almacenamiento, y la URL devuelta reemplazara a `url`.
 */
export interface ImageDraft {
  url: string
  file?: File
  name: string
  /** Tamano en bytes. Solo disponible para archivos recien elegidos. */
  size?: number
}

export interface ProductFilters {
  search?: string
  categoryId?: CategoryId | 'all'
  status?: ProductStatus | 'all'
}

export interface ProductStats {
  total: number
  active: number
  outOfStock: number
  categories: number
}

// ---------------------------------------------------------------------------
// Promociones
// ---------------------------------------------------------------------------

/** 'all' = todo el catalogo; 'selected' = solo los productos elegidos. */
export type PromotionScope = 'all' | 'selected'

/** Promocion ya resuelta para un producto concreto. */
export interface AppliedPromotion {
  id: string
  name: string
  discountPercent: number
  scope: PromotionScope
}

/**
 * Estado calculado de una promocion:
 *  - running   : activa y dentro del rango de fechas (se esta aplicando ya)
 *  - scheduled : activa pero su fecha de inicio aun no ha llegado
 *  - expired   : su fecha de fin ya paso
 *  - disabled  : desactivada manualmente
 */
export type PromotionState = 'running' | 'scheduled' | 'expired' | 'disabled'

export interface AdminPromotion {
  id: string
  name: string
  discountPercent: number
  scope: PromotionScope
  /** Instante ISO de inicio. */
  startsAt: string
  /** Instante ISO de fin (inclusive). */
  endsAt: string
  isActive: boolean
  /** Ids de producto cuando `scope` es 'selected'. Vacio cuando es 'all'. */
  productIds: string[]
  state: PromotionState
  createdAt: string
  updatedAt: string
}

/** Lo que el formulario envia: sin id, sin estado calculado y sin timestamps. */
export type PromotionInput = Omit<
  AdminPromotion,
  'id' | 'state' | 'createdAt' | 'updatedAt'
>

// ---------------------------------------------------------------------------
// Secciones de tienda (visibilidad de categorias)
// ---------------------------------------------------------------------------

/**
 * Categoria vista como "seccion de tienda" desde el panel: lo que importa aqui
 * es si el cliente la ve o no, y cuantos productos hay detras.
 */
export interface AdminStoreSection {
  id: string
  name: string
  slug: CategoryId
  /** Texto de presentacion. Vacio = texto por defecto de la seccion. */
  description: string
  isVisible: boolean
  /** Seccion de siempre (camisas, gorras, pines): su slug no se puede cambiar. */
  isBuiltIn: boolean
  /** Productos totales de la categoria, activos e inactivos. */
  productCount: number
  /** Productos que el cliente veria si la seccion esta visible. */
  activeProductCount: number
}

/** Tipo de gorra (Beisbolera, Cerrada...) tal como lo ve el panel. */
export interface AdminCapType {
  id: string
  name: string
  slug: string
  /** Inactivo: fuera del filtro de la tienda y no asignable a productos. */
  isActive: boolean
  /** Se vende por talla cerrada: activa la Guia de tallas en la tienda. */
  usesFittedSizes: boolean
  /** Gorras que tienen asignado este tipo. Con alguna no se puede borrar. */
  productCount: number
}

/** Fecha especial (temporada visual de la tienda) tal como la ve el panel. */
export interface AdminSpecialDate {
  id: string
  slug: SeasonSlug
  name: string
  /** Que cambia en la tienda al activarla (sale del registro de temporadas). */
  description: string
  isActive: boolean
  updatedAt: string
}

export interface PromotionStats {
  total: number
  running: number
  scheduled: number
  expired: number
}

/** Estado del pago en Wompi. */
export type OrderPaymentStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR'

/** Gestion interna del pedido (preparacion y envio). */
export type OrderFulfillment = 'NEW' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export interface AdminOrderItem {
  id: string
  productId: string | null
  productName: string
  unitPrice: number
  quantity: number
  size: string | null
  color: string | null
}

/** 'ONLINE' = tienda en linea (Wompi); 'IN_PERSON' = venta presencial. */
export type SaleChannel = 'ONLINE' | 'IN_PERSON'

export type PaymentMethod = 'WOMPI' | 'CASH' | 'TRANSFER' | 'OTHER'

/** Metodos que se pueden elegir al registrar una venta presencial. */
export type ManualPaymentMethod = Exclude<PaymentMethod, 'WOMPI'>

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  WOMPI: 'Wompi',
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
}

export interface AdminOrder {
  id: string
  reference: string
  channel: SaleChannel
  paymentMethod: PaymentMethod
  paymentStatus: OrderPaymentStatus
  fulfillment: OrderFulfillment
  total: number
  customerName: string
  customerEmail: string
  customerPhone: string
  address: string
  city: string
  region: string
  notes: string | null
  wompiTransactionId: string | null
  paymentMethodType: string | null
  statusMessage: string | null
  paidAt: string | null
  createdAt: string
  items: AdminOrderItem[]
}

// ---------------------------------------------------------------------------
// Ventas y analiticas
// ---------------------------------------------------------------------------

/** Lo que envia el formulario "Registrar venta". */
export interface ManualSaleInput {
  productId: string
  quantity: number
  /** Precio real al que se vendio cada unidad (COP, sin decimales). */
  unitPrice: number
  paymentMethod: ManualPaymentMethod
  customerName?: string
  /** Dia de la venta, "YYYY-MM-DD" (hora de Colombia). */
  soldAt: string
  notes?: string
  idempotencyKey: string
}

export type AnalyticsPreset =
  | 'today'
  | '7d'
  | '30d'
  | 'month'
  | 'prev-month'
  | 'custom'

export interface AnalyticsQuery {
  preset: AnalyticsPreset
  /** Solo con preset 'custom'. "YYYY-MM-DD", ambos inclusive. */
  from?: string
  to?: string
}

export interface ProductSales {
  /** Id del producto, o su nombre si el producto ya fue eliminado. */
  key: string
  name: string
  units: number
  revenue: number
}

export interface CategorySales {
  slug: string
  name: string
  units: number
  revenue: number
}

export interface MethodSales {
  method: PaymentMethod
  sales: number
  revenue: number
}

export interface MonthComparisonMetric {
  current: number
  previous: number
  diff: number
  /** null cuando el mes anterior fue 0: no hay base para un porcentaje. */
  percent: number | null
}

export type MonthlyRevenue = { month: string; total: number } & Record<
  PaymentMethod,
  number
>

/**
 * Informe de ventas. Todo sale de pedidos con pago APPROVED: pedidos en linea
 * confirmados por Wompi y ventas presenciales. La fecha de una venta es
 * `paidAt`, y los dias y meses se cortan en hora de Colombia.
 */
export interface AnalyticsReport {
  /** Periodo aplicado, "YYYY-MM-DD", ambos inclusive. */
  range: { from: string; to: string }
  summary: { revenue: number; sales: number; units: number; avgTicket: number }
  /** Un punto por dia del periodo, incluidos los dias sin ventas. */
  daily: { date: string; revenue: number; sales: number }[]
  /** Ultimos 6 meses (independiente del periodo), ingresos por metodo. */
  monthly: MonthlyRevenue[]
  topByUnits: ProductSales[]
  topByRevenue: ProductSales[]
  byCategory: CategorySales[]
  byMethod: MethodSales[]
  /** Mes en curso contra el mes anterior completo (independiente del periodo). */
  comparison: {
    currentMonth: string
    previousMonth: string
    revenue: MonthComparisonMetric
    sales: MonthComparisonMetric
  }
  /**
   * Pagados: ventas del periodo. Pendientes y rechazados/cancelados: pedidos
   * creados en el periodo que no llegaron a pagarse.
   */
  orderStatus: { paid: number; pending: number; rejected: number }
}

/** Configuracion de la cinta marquesina de la portada. */
export interface AdminMarquee {
  /** Frases separadas por "·". */
  text: string
  /** Plantilla de "Usar mensaje predeterminado". Solo lectura para el panel. */
  defaultText: string
  isActive: boolean
  /** null si la configuracion aun no se ha guardado nunca. */
  updatedAt: string | null
}

/** Configuracion del Hero de la portada. */
export interface AdminHero {
  /** Que medio muestra la tienda. */
  mediaType: 'video' | 'image'
  videoUrl: string | null
  imageUrl: string | null
  isActive: boolean
  /** null si la configuracion aun no se ha guardado nunca. */
  updatedAt: string | null
}
