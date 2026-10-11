'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Boxes, Eye, PackageX, Plus, Tags, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { useProducts } from '@/components/admin/products-provider'
import { ProductPrice } from '@/components/admin/product-price'
import { RegisterSaleButton } from '@/components/admin/register-sale-dialog'
import { SalesAnalytics } from '@/components/admin/sales-analytics'
import { StatsCard } from '@/components/admin/stats-card'
import { StatusBadge, StockBadge } from '@/components/admin/status-badge'
import { useCategories } from '@/components/admin/categories-provider'
import { computeProductStats, sortByRecent } from '@/lib/admin/products-service'
import { adminRoutes } from '@/lib/admin/routes'
import { ProductThumb } from '@/components/admin/product-thumb'

const RECENT_COUNT = 5

export default function AdminDashboardPage() {
  const { categories, labelFor } = useCategories()
  const { products, isLoading, error } = useProducts()
  // Sube al registrar una venta: las analiticas vuelven a pedirse.
  const [salesVersion, setSalesVersion] = useState(0)

  const stats = useMemo(
    () => computeProductStats(products, categories.length),
    [products, categories.length],
  )
  const recent = useMemo(
    () => sortByRecent(products).slice(0, RECENT_COUNT),
    [products],
  )

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Resumen del catalogo de STREETVIBE."
        actions={
          <>
            <RegisterSaleButton onRegistered={() => setSalesVersion((v) => v + 1)} />
            <Button asChild variant="outline">
              <Link href={adminRoutes.newProduct}>
                <Plus className="size-4" />
                Nuevo producto
              </Link>
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Estadisticas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatsCard
          index={0}
          label="Total productos"
          value={stats.total}
          hint="En el catalogo"
          icon={Boxes}
          isLoading={isLoading}
        />
        <StatsCard
          index={1}
          label="Productos activos"
          value={stats.active}
          hint="Visibles en la tienda"
          icon={Eye}
          tone="positive"
          isLoading={isLoading}
        />
        <StatsCard
          index={2}
          label="Productos agotados"
          value={stats.outOfStock}
          hint="Sin existencias"
          icon={PackageX}
          tone={stats.outOfStock > 0 ? 'danger' : 'neutral'}
          isLoading={isLoading}
        />
        <StatsCard
          index={3}
          label="Categorias"
          value={stats.categories}
          hint="Secciones de la tienda"
          icon={Tags}
          isLoading={isLoading}
        />
      </div>

      {/* Productos recientes */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.24, ease: 'easeOut' }}
        className="mt-6 rounded-xl border border-border bg-card/40"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              Productos recientes
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Los ultimos anadidos al catalogo
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Link href={adminRoutes.products}>Ver todos</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4 sm:p-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-secondary/60"
              />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Todavia no hay productos en el catalogo.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((product) => (
              <li
                key={product.id}
                className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-secondary/25 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <ProductThumb
                    product={product}
                    className="size-12 rounded-lg border border-border bg-secondary"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {product.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {labelFor(product.categoryId)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
                  <ProductPrice product={product} className="text-sm" />
                  <div className="flex shrink-0 items-center gap-2">
                    <StockBadge stock={product.stock} />
                    <StatusBadge status={product.status} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      <SalesAnalytics products={products} refreshKey={salesVersion} />    </>
  )
}
