'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, PackageX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { ProductForm } from '@/components/admin/product-form'
import { useProducts } from '@/components/admin/products-provider'
import { adminRoutes } from '@/lib/admin/routes'

export default function EditProductPage() {
  const params = useParams()
  const rawId = params?.id
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  const { isLoading, findProduct } = useProducts()

  const product = id ? findProduct(id) : undefined

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <Link href={adminRoutes.products}>
          <ArrowLeft className="size-4" />
          Volver a productos
        </Link>
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-9 w-64 animate-pulse rounded-lg bg-secondary/60" />
          <div className="h-64 animate-pulse rounded-xl border border-border bg-card/40" />
        </div>
      ) : !product ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/20 px-6 py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground">
            <PackageX className="size-5" />
          </span>
          <p className="mt-4 font-medium text-foreground">
            No se ha encontrado el producto
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Puede que se haya eliminado, o que la pagina se haya recargado: en
            esta etapa los datos viven en memoria y se reinician al recargar.
          </p>
          <Button asChild className="mt-5">
            <Link href={adminRoutes.products}>Volver a productos</Link>
          </Button>
        </div>
      ) : (
        <>
          <AdminPageHeader
            title="Editar producto"
            description={`Estas editando "${product.name}". Codigo ${product.code} (asignado automaticamente, no se puede cambiar).`}
          />
          {/* La key fuerza a reiniciar el estado del formulario si cambia el
              producto que se esta editando. */}
          <ProductForm key={product.id} mode="edit" product={product} />
        </>
      )}
    </>
  )
}
