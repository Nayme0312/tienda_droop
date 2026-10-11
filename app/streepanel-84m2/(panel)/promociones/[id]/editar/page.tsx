'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, TicketPercent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { PromotionForm } from '@/components/admin/promotion-form'
import { usePromotions } from '@/components/admin/promotions-provider'
import { adminRoutes } from '@/lib/admin/routes'

export default function EditPromotionPage() {
  const params = useParams()
  const rawId = params?.id
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  const { isLoading, findPromotion } = usePromotions()

  const promotion = id ? findPromotion(id) : undefined

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <Link href={adminRoutes.promotions}>
          <ArrowLeft className="size-4" />
          Volver a promociones
        </Link>
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-9 w-64 animate-pulse rounded-lg bg-secondary/60" />
          <div className="h-64 animate-pulse rounded-xl border border-border bg-card/40" />
        </div>
      ) : !promotion ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/20 px-6 py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground">
            <TicketPercent className="size-5" />
          </span>
          <p className="mt-4 font-medium text-foreground">
            No se ha encontrado la promocion
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Puede que se haya eliminado desde otra pestana.
          </p>
          <Button asChild className="mt-5">
            <Link href={adminRoutes.promotions}>Volver a promociones</Link>
          </Button>
        </div>
      ) : (
        <>
          <AdminPageHeader
            title="Editar promocion"
            description={`Estas editando "${promotion.name}".`}
          />
          {/* La key reinicia el estado del formulario si cambia la promocion. */}
          <PromotionForm key={promotion.id} mode="edit" promotion={promotion} />
        </>
      )}
    </>
  )
}
