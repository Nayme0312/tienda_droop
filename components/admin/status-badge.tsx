import { cn } from '@/lib/utils'
import type { ProductStatus } from '@/lib/admin/types'

/** Por debajo de este stock se avisa de existencias bajas. */
export const LOW_STOCK_THRESHOLD = 5

const base =
  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap'

/** Activo / Inactivo. */
export function StatusBadge({
  status,
  className,
}: {
  status: ProductStatus
  className?: string
}) {
  const active = status === 'active'

  return (
    <span
      className={cn(
        base,
        active
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
          : 'border-border bg-muted text-muted-foreground',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          active ? 'bg-emerald-400' : 'bg-muted-foreground',
        )}
      />
      {active ? 'Activo' : 'Inactivo'}
    </span>
  )
}

/** Existencias, con aviso cuando estan bajas o agotadas. */
export function StockBadge({
  stock,
  className,
}: {
  stock: number
  className?: string
}) {
  if (stock === 0) {
    return (
      <span
        className={cn(
          base,
          'border-red-500/20 bg-red-500/10 text-red-400',
          className,
        )}
      >
        Agotado
      </span>
    )
  }

  const low = stock <= LOW_STOCK_THRESHOLD

  return (
    <span
      className={cn(
        base,
        low
          ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
          : 'border-border bg-secondary/60 text-foreground/80',
        className,
      )}
    >
      {stock} <span className="text-muted-foreground">uds</span>
    </span>
  )
}
