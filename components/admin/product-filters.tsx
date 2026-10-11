'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CategoryId } from '@/lib/admin/categories'
import type { ProductStatus } from '@/lib/admin/types'
import { useCategories } from './categories-provider'

export type CategoryFilterValue = CategoryId | 'all'
export type StatusFilterValue = ProductStatus | 'all'

/**
 * Barra de busqueda y filtros del listado.
 *
 * Es un componente controlado: quien lo usa es el dueno del estado. En las
 * paginas por categoria el filtro de categoria se oculta con
 * `showCategoryFilter={false}`, porque la categoria ya viene fijada por la URL.
 */
export function ProductFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  showCategoryFilter = true,
}: {
  search: string
  onSearchChange: (value: string) => void
  category: CategoryFilterValue
  onCategoryChange: (value: CategoryFilterValue) => void
  status: StatusFilterValue
  onStatusChange: (value: StatusFilterValue) => void
  showCategoryFilter?: boolean
}) {
  const { categories } = useCategories()
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Buscador */}
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nombre o codigo..."
          aria-label="Buscar producto por nombre o codigo"
          className="bg-card/60 pl-9 pr-9"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Limpiar busqueda"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        {showCategoryFilter && (
          <Select
            value={category}
            onValueChange={(value) =>
              onCategoryChange(value as CategoryFilterValue)
            }
          >
            <SelectTrigger
              aria-label="Filtrar por categoria"
              className="min-w-0 flex-1 bg-card/60 sm:w-[9.5rem] sm:flex-none"
            >
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((item) => (
                <SelectItem key={item.slug} value={item.slug}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value as StatusFilterValue)}
        >
          <SelectTrigger
            aria-label="Filtrar por estado"
            className="min-w-0 flex-1 bg-card/60 sm:w-[9.5rem] sm:flex-none"
          >
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
