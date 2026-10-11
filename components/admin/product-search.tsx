'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/admin/format'
import * as productsService from '@/lib/admin/products-service'
import type { AdminProduct } from '@/lib/admin/types'

const DEBOUNCE_MS = 250
const MAX_RESULTS = 8

/**
 * Buscador de producto por nombre o codigo para "Registrar venta".
 *
 * Busca en PostgreSQL a traves de la API (no sobre una lista cargada en el
 * navegador) y trae como mucho MAX_RESULTS coincidencias, asi que funciona
 * igual con 15 productos que con miles.
 */
export function ProductSearch({
  onSelect,
  invalid = false,
}: {
  onSelect: (product: AdminProduct) => void
  invalid?: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminProduct[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [failed, setFailed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const term = query.trim()

  useEffect(() => {
    if (!term) {
      setResults([])
      setIsSearching(false)
      setFailed(false)
      return
    }

    let active = true
    setIsSearching(true)
    // Se espera a que el administrador deje de escribir antes de consultar.
    const timer = setTimeout(() => {
      productsService
        .searchProducts(term, MAX_RESULTS)
        .then((found) => {
          if (!active) return
          setResults(found)
          setActiveIndex(0)
          setFailed(false)
        })
        .catch(() => {
          if (!active) return
          setResults([])
          setFailed(true)
        })
        .finally(() => active && setIsSearching(false))
    }, DEBOUNCE_MS)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [term])

  const choose = (product: AdminProduct | undefined) => {
    if (!product || product.stock === 0) return
    onSelect(product)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      // Enter elige el resultado marcado; nunca envia el formulario de venta.
      event.preventDefault()
      if (!isSearching) choose(results[activeIndex])
    }
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          autoFocus
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nombre o codigo del producto"
          aria-label="Buscar producto por nombre o codigo"
          aria-invalid={invalid}
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-9 text-sm text-foreground outline-none transition-colors focus:border-foreground/40 aria-[invalid=true]:border-red-500/60"
        />
        {isSearching && (
          <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {term && !isSearching && (
        <div className="mt-2 overflow-hidden rounded-lg border border-border bg-background/50">
          {failed ? (
            <p className="px-3 py-3 text-sm text-red-400">
              No se pudo buscar. Intentalo de nuevo.
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Ningun producto coincide con &quot;{term}&quot;.
            </p>
          ) : (
            <ul role="listbox" className="max-h-64 divide-y divide-border overflow-y-auto">
              {results.map((product, index) => {
                const soldOut = product.stock === 0
                return (
                  <li key={product.id} role="option" aria-selected={index === activeIndex}>
                    <button
                      type="button"
                      disabled={soldOut}
                      onClick={() => choose(product)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        'block w-full px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        index === activeIndex && !soldOut && 'bg-secondary/60',
                      )}
                    >
                      <span className="block truncate text-sm font-medium text-foreground">
                        {product.name}
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span>
                          Codigo:{' '}
                          <span className="font-mono font-semibold text-foreground">
                            {product.code}
                          </span>
                        </span>
                        <span>Stock: {soldOut ? 'agotado' : product.stock}</span>
                        <span>
                          Precio:{' '}
                          {formatPrice(product.discountedPrice ?? product.price)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
