'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PackageX, Plus, SearchX, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { CategoryId } from '@/lib/admin/categories'
import { useCategories } from './categories-provider'
import { ApiError } from '@/lib/api/client'
import { filterProducts } from '@/lib/admin/products-service'
import { adminRoutes } from '@/lib/admin/routes'
import type { AdminProduct } from '@/lib/admin/types'
import { AdminPageHeader } from './admin-page-header'
import { ConfirmDialog } from './confirm-dialog'
import {
  ProductFilters,
  type CategoryFilterValue,
  type StatusFilterValue,
} from './product-filters'
import { ProductListCard } from './product-list-card'
import { ProductTable } from './product-table'
import { useProducts } from './products-provider'

/**
 * Listado de productos completo: encabezado, filtros, tabla (escritorio),
 * tarjetas (movil) y confirmacion de borrado.
 *
 * Lo reutilizan la pagina de Productos y las tres paginas por categoria. En
 * esas ultimas se pasa `lockedCategory`, que fija la categoria y oculta su
 * filtro: asi no se duplica nada de la logica del listado.
 */
export function ProductsView({
  title,
  description,
  lockedCategory,
  children,
}: {
  title: string
  description?: string
  lockedCategory?: CategoryId
  /** Bloque propio de la categoria, entre el encabezado y el listado. */
  children?: React.ReactNode
}) {
  const router = useRouter()
  const {
    products,
    isLoading,
    error,
    deleteProduct,
    toggleProductStatus,
    setProductFeatured,
  } = useProducts()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilterValue>('all')
  const [status, setStatus] = useState<StatusFilterValue>('all')
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [featuredPendingIds, setFeaturedPendingIds] = useState<
    ReadonlySet<string>
  >(new Set())

  const filtered = useMemo(
    () =>
      filterProducts(products, {
        search,
        categoryId: lockedCategory ?? category,
        status,
      }),
    [products, search, category, status, lockedCategory],
  )

  /** Total del ambito de la pagina, ignorando busqueda y estado. */
  const scopeTotal = useMemo(
    () =>
      lockedCategory
        ? products.filter((p) => p.categoryId === lockedCategory).length
        : products.length,
    [products, lockedCategory],
  )

  const hasActiveFilters =
    search.trim() !== '' || status !== 'all' || (!lockedCategory && category !== 'all')

  const handleToggleStatus = async (product: AdminProduct) => {
    setPendingId(product.id)
    try {
      const updated = await toggleProductStatus(product.id)
      toast.success(
        updated.status === 'active'
          ? `"${updated.name}" esta activo`
          : `"${updated.name}" esta inactivo`,
      )
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cambiar el estado del producto',
      )
    } finally {
      setPendingId(null)
    }
  }

  const handleToggleFeatured = async (product: AdminProduct) => {
    const featured = !product.isFeatured
    setFeaturedPendingIds((ids) => new Set(ids).add(product.id))
    try {
      await setProductFeatured(product.id, featured)
      toast.success(
        featured
          ? `"${product.name}" se muestra en la portada`
          : `"${product.name}" ya no esta destacado`,
      )
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cambiar el destacado del producto',
      )
    } finally {
      setFeaturedPendingIds((ids) => {
        const next = new Set(ids)
        next.delete(product.id)
        return next
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const { id, name } = deleteTarget
    setPendingId(id)
    try {
      await deleteProduct(id)
      setDeleteTarget(null)
      toast.success(`"${name}" se ha eliminado`)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'No se pudo eliminar el producto',
      )
    } finally {
      setPendingId(null)
    }
  }

  const resetFilters = () => {
    setSearch('')
    setStatus('all')
    if (!lockedCategory) setCategory('all')
  }

  return (
    <>
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          <Button asChild>
            <Link href={adminRoutes.newProduct}>
              <Plus className="size-4" />
              Nuevo producto
            </Link>
          </Button>
        }
      />

      {children}

      <div className="space-y-4">
        <ProductFilters
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          status={status}
          onStatusChange={setStatus}
          showCategoryFilter={!lockedCategory}
        />

        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            {filtered.length}{' '}
            {filtered.length === 1 ? 'producto' : 'productos'}
            {filtered.length !== scopeTotal && ` de ${scopeTotal}`}
          </p>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-border bg-card/40 lg:h-16"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasActiveFilters={hasActiveFilters}
            scopeEmpty={scopeTotal === 0}
            lockedCategory={lockedCategory}
            onReset={resetFilters}
          />
        ) : (
          <>
            {/* Escritorio: tabla */}
            <div className="hidden lg:block">
              <ProductTable
                products={filtered}
                pendingId={pendingId}
                featuredPendingIds={featuredPendingIds}
                onToggleFeatured={handleToggleFeatured}
                onEdit={(product) =>
                  router.push(adminRoutes.editProduct(product.id))
                }
                onDelete={setDeleteTarget}
                onToggleStatus={handleToggleStatus}
              />
            </div>

            {/* Movil y tablet: tarjetas */}
            <div className="space-y-3 lg:hidden">
              {filtered.map((product, index) => (
                <ProductListCard
                  key={product.id}
                  product={product}
                  index={index}
                  pendingId={pendingId}
                  featuredPendingIds={featuredPendingIds}
                  onToggleFeatured={handleToggleFeatured}
                  onEdit={(item) =>
                    router.push(adminRoutes.editProduct(item.id))
                  }
                  onDelete={setDeleteTarget}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="¿Estas seguro de eliminar este producto?"
        description={
          deleteTarget
            ? `Se eliminara "${deleteTarget.name}" del catalogo. Esta accion no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        isPending={pendingId === deleteTarget?.id}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}

function EmptyState({
  hasActiveFilters,
  scopeEmpty,
  lockedCategory,
  onReset,
}: {
  hasActiveFilters: boolean
  scopeEmpty: boolean
  lockedCategory?: CategoryId
  onReset: () => void
}) {
  const { labelFor } = useCategories()
  // Se distingue "no hay productos" de "los filtros no devuelven nada":
  // la accion util es distinta en cada caso.
  const filteredOut = hasActiveFilters && !scopeEmpty

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/20 px-6 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground">
        {filteredOut ? (
          <SearchX className="size-5" />
        ) : (
          <PackageX className="size-5" />
        )}
      </span>
      <p className="mt-4 font-medium text-foreground">
        {filteredOut
          ? 'Ningun producto coincide con los filtros'
          : lockedCategory
            ? `Todavia no hay productos en ${labelFor(lockedCategory)}`
            : 'Todavia no hay productos'}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filteredOut
          ? 'Prueba con otra busqueda o quita los filtros.'
          : 'Crea el primero para que aparezca en la tienda.'}
      </p>
      <div className="mt-5">
        {filteredOut ? (
          <Button variant="outline" onClick={onReset}>
            Quitar filtros
          </Button>
        ) : (
          <Button asChild>
            <Link href={adminRoutes.newProduct}>
              <Plus className="size-4" />
              Nuevo producto
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
