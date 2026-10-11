import type { AdminProduct } from '@/lib/admin/types'

/**
 * Acciones que el listado ofrece sobre un producto. La comparten la tabla de
 * escritorio y las tarjetas de movil, para que ambas vistas se comporten igual.
 */
export interface ProductActions {
  onEdit: (product: AdminProduct) => void
  onDelete: (product: AdminProduct) => void
  onToggleStatus: (product: AdminProduct) => void
  /** Estrella de destacado en la portada. */
  onToggleFeatured: (product: AdminProduct) => void
  /** Id del producto con una operacion en curso: deshabilita sus botones. */
  pendingId?: string | null
  /** Ids con un cambio de estrella en curso (solo deshabilita la estrella). */
  featuredPendingIds?: ReadonlySet<string>
}
