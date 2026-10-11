'use client'

import { motion } from 'framer-motion'
import { Eye, EyeOff, LoaderCircle, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCategories } from './categories-provider'
import { formatDate } from '@/lib/admin/format'
import type { AdminProduct } from '@/lib/admin/types'
import type { ProductActions } from './product-actions'
import { ProductPrice } from './product-price'
import { StatusBadge, StockBadge } from './status-badge'
import { ProductThumb } from './product-thumb'
import { FeaturedStar } from './featured-star'

/**
 * Version del listado para movil y tablet.
 *
 * Sustituye a la tabla por debajo de `lg`: la misma informacion, pero apilada
 * en tarjeta para que nada se salga de la pantalla a 320px.
 */
export function ProductListCard({
  product,
  index = 0,
  onEdit,
  onDelete,
  onToggleStatus,
  onToggleFeatured,
  pendingId,
  featuredPendingIds,
}: {
  product: AdminProduct
  index?: number
} & ProductActions) {
  const { labelFor } = useCategories()
  const pending = pendingId === product.id
  const isActive = product.status === 'active'

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      // Se acota el retardo para que una lista larga no tarde en aparecer.
      transition={{
        duration: 0.3,
        delay: Math.min(index, 8) * 0.04,
        ease: 'easeOut',
      }}
      className="rounded-xl border border-border bg-card/60 p-3"
    >
      <div className="flex gap-3">
        <ProductThumb
          product={product}
          className="size-16 rounded-lg border border-border bg-secondary"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight text-foreground">
            {product.name}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">
              {product.code}
            </span>{' '}
            · {labelFor(product.categoryId)} ·{' '}
            {formatDate(product.createdAt)}
          </p>
          <ProductPrice product={product} className="mt-1.5" />
        </div>
        <FeaturedStar
          product={product}
          pending={featuredPendingIds?.has(product.id)}
          onToggle={onToggleFeatured}
          className="-mr-1 -mt-1 size-9 shrink-0"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StockBadge stock={product.stock} />
        <StatusBadge status={product.status} />
      </div>

      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => onEdit(product)}
        >
          <Pencil className="size-3.5" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => onDelete(product)}
          className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="size-3.5" />
          Eliminar
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={pending}
          onClick={() => onToggleStatus(product)}
          title={isActive ? 'Desactivar' : 'Activar'}
          aria-label={
            isActive ? `Desactivar ${product.name}` : `Activar ${product.name}`
          }
        >
          {pending ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : isActive ? (
            <Eye className="size-3.5" />
          ) : (
            <EyeOff className="size-3.5" />
          )}
        </Button>
      </div>
    </motion.article>
  )
}
