'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCategories } from './categories-provider'
import { formatPrice } from '@/lib/admin/format'
import type { AdminProduct } from '@/lib/admin/types'
import { ProductThumb } from './product-thumb'

/**
 * Seleccion de productos para una promocion de ambito 'selected'.
 *
 * Lista con buscador y casillas. Se apoya en los productos que ya tiene
 * cargados ProductsProvider, asi que no hace ninguna peticion propia.
 */
export function ProductMultiSelect({
  products,
  selectedIds,
  onChange,
  disabled = false,
  error,
}: {
  products: AdminProduct[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
  error?: string
}) {
  const { labelFor } = useCategories()
  const [search, setSearch] = useState('')

  const selected = useMemo(() => new Set(selectedIds), [selectedIds])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products
    return products.filter((product) =>
      product.name.toLowerCase().includes(term),
    )
  }, [products, search])

  const toggle = (id: string) => {
    if (selected.has(id)) {
      onChange(selectedIds.filter((item) => item !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          Productos incluidos
        </p>
        <span className="text-xs text-muted-foreground">
          {selectedIds.length} seleccionado
          {selectedIds.length === 1 ? '' : 's'}
        </span>
      </div>

      <div
        className={cn(
          'rounded-xl border bg-card/30',
          error ? 'border-red-500/40' : 'border-border',
        )}
      >
        {/* Buscador y acciones rapidas */}
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto..."
              aria-label="Buscar producto para la promocion"
              disabled={disabled}
              className="bg-background/60 pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpiar busqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || filtered.length === 0}
              onClick={() => {
                // Anade los visibles sin perder los ya elegidos que el filtro oculta.
                const merged = new Set(selectedIds)
                for (const product of filtered) merged.add(product.id)
                onChange([...merged])
              }}
            >
              Seleccionar todos
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || selectedIds.length === 0}
              onClick={() => onChange([])}
            >
              Ninguno
            </Button>
          </div>
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Ningun producto coincide con la busqueda.
          </p>
        ) : (
          <ul className="max-h-72 divide-y divide-border overflow-y-auto">
            {filtered.map((product) => {
              const isSelected = selected.has(product.id)
              return (
                <li key={product.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors',
                      isSelected ? 'bg-secondary/40' : 'hover:bg-secondary/25',
                      disabled && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={disabled}
                      onChange={() => toggle(product.id)}
                      className="size-4 shrink-0 accent-foreground"
                    />
                    <ProductThumb
                      product={product}
                      alt=""
                      className="size-9 rounded-md border border-border bg-secondary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {product.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {labelFor(product.categoryId)} ·{' '}
                        {formatPrice(product.price)}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
