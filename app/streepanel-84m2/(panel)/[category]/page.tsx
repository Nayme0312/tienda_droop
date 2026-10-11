'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ProductsView } from '@/components/admin/products-view'
import { CapTypesManager } from '@/components/admin/cap-types-manager'
import { useCategories } from '@/components/admin/categories-provider'
import { adminRoutes } from '@/lib/admin/routes'
import { isCapSection } from '@/lib/caps/cap-types'

/**
 * Productos de una categoria. Una sola pagina para todas las secciones de
 * tienda, incluidas las creadas desde el panel: reutiliza el listado de
 * /productos fijando la categoria. Las rutas fijas del panel (productos,
 * pedidos...) tienen prioridad sobre esta, y la API impide crear secciones
 * con esos nombres.
 */
export default function AdminCategoryPage() {
  const { category } = useParams<{ category: string }>()
  const { categories, isLoading } = useCategories()
  const current = categories.find((c) => c.slug === category)

  if (!isLoading && !current) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-6 text-center">
        <p className="font-medium text-foreground">Categoria no encontrada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Puede que se haya eliminado o cambiado de identificador.
        </p>
        <Link
          href={adminRoutes.sections}
          className="mt-4 inline-block text-sm font-medium text-foreground underline underline-offset-2"
        >
          Ir a Secciones de tienda
        </Link>
      </div>
    )
  }

  const name = current?.name ?? ''
  return (
    <ProductsView
      title={name}
      description={name ? `Productos de la categoria ${name}.` : ''}
      lockedCategory={category}
    >
      {/* Gorras: administracion de sus tipos (filtro de la tienda) */}
      {isCapSection(category) && <CapTypesManager />}
    </ProductsView>
  )
}
