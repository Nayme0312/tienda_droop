'use client'

import { Eye, EyeOff, LoaderCircle, Pencil, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
 * Listado en tabla. Solo se monta desde `lg` hacia arriba; por debajo el
 * listado usa ProductListCard, asi que aqui no hace falta pelear con el
 * desbordamiento horizontal.
 */
export function ProductTable({
  products,
  onEdit,
  onDelete,
  onToggleStatus,
  onToggleFeatured,
  pendingId,
  featuredPendingIds,
}: { products: AdminProduct[] } & ProductActions) {
  const { labelFor } = useCategories()
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-12 py-3 pl-3 pr-0">
              <span className="sr-only">Destacado</span>
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Codigo
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Producto
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Categoria
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Precio
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Stock
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Estado
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fecha
            </TableHead>
            <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {products.map((product) => {
            const pending = pendingId === product.id
            const isActive = product.status === 'active'

            return (
              <TableRow
                key={product.id}
                className="border-border transition-colors hover:bg-secondary/30"
              >
                <TableCell className="py-3 pl-3 pr-0">
                  <FeaturedStar
                    product={product}
                    pending={featuredPendingIds?.has(product.id)}
                    onToggle={onToggleFeatured}
                  />
                </TableCell>

                <TableCell className="px-4 py-3 font-mono text-sm font-semibold tabular-nums text-foreground">
                  {product.code}
                </TableCell>

                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ProductThumb
                      product={product}
                      className="size-11 rounded-lg border border-border bg-secondary"
                    />
                    <p className="min-w-0 truncate font-medium text-foreground">
                      {product.name}
                    </p>
                  </div>
                </TableCell>

                <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                  {labelFor(product.categoryId)}
                </TableCell>

                <TableCell className="px-4 py-3">
                  <ProductPrice product={product} />
                </TableCell>

                <TableCell className="px-4 py-3">
                  <StockBadge stock={product.stock} />
                </TableCell>

                <TableCell className="px-4 py-3">
                  <StatusBadge status={product.status} />
                </TableCell>

                <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                  {formatDate(product.createdAt)}
                </TableCell>

                <TableCell className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      onClick={() => onToggleStatus(product)}
                      title={isActive ? 'Desactivar' : 'Activar'}
                      aria-label={
                        isActive
                          ? `Desactivar ${product.name}`
                          : `Activar ${product.name}`
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {pending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : isActive ? (
                        <Eye className="size-4" />
                      ) : (
                        <EyeOff className="size-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      onClick={() => onEdit(product)}
                      title="Editar"
                      aria-label={`Editar ${product.name}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      onClick={() => onDelete(product)}
                      title="Eliminar"
                      aria-label={`Eliminar ${product.name}`}
                      className="text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
