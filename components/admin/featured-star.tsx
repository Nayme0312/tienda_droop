'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminProduct } from '@/lib/admin/types'

/**
 * Estrella de "destacado en la portada". Rellena y naranja si el producto esta
 * destacado; contorno discreto si no. La comparten la tabla y las tarjetas.
 */
export function FeaturedStar({
  product,
  pending = false,
  onToggle,
  className,
}: {
  product: AdminProduct
  pending?: boolean
  onToggle: (product: AdminProduct) => void
  className?: string
}) {
  const featured = product.isFeatured
  const label = featured
    ? `Quitar ${product.name} de destacados`
    : `Destacar ${product.name} en la portada`

  return (
    <button
      type="button"
      onClick={() => onToggle(product)}
      disabled={pending}
      aria-pressed={featured}
      aria-label={label}
      title={featured ? 'Destacado en la portada' : 'Destacar en la portada'}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md transition-[color,background-color,scale] duration-200 hover:bg-orange-500/10 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 disabled:cursor-wait disabled:opacity-60',
        featured
          ? 'text-orange-500'
          : 'text-muted-foreground/50 hover:text-orange-400',
        className,
      )}
    >
      <Star
        className={cn('size-4', featured && 'fill-orange-500')}
        strokeWidth={featured ? 1.75 : 1.5}
      />
    </button>
  )
}
