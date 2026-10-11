'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Eye,
  EyeOff,
  LoaderCircle,
  Pencil,
  Plus,
  SearchX,
  TicketPercent,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApiError } from '@/lib/api/client'
import { formatDateRange } from '@/lib/admin/promotion-dates'
import { filterPromotions } from '@/lib/admin/promotions-service'
import { adminRoutes } from '@/lib/admin/routes'
import type { AdminPromotion, PromotionState } from '@/lib/admin/types'
import { AdminPageHeader } from './admin-page-header'
import { ConfirmDialog } from './confirm-dialog'
import { PromotionStateBadge } from './promotion-state-badge'
import { usePromotions } from './promotions-provider'

type StateFilter = PromotionState | 'all'

/** A que se aplica, en texto. */
function scopeLabel(promotion: AdminPromotion): string {
  if (promotion.scope === 'all') return 'Todos los productos'
  const n = promotion.productIds.length
  return `${n} producto${n === 1 ? '' : 's'}`
}

export function PromotionsView() {
  const router = useRouter()
  const { promotions, isLoading, error, deletePromotion, togglePromotionStatus } =
    usePromotions()

  const [search, setSearch] = useState('')
  const [state, setState] = useState<StateFilter>('all')
  const [deleteTarget, setDeleteTarget] = useState<AdminPromotion | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const filtered = useMemo(
    () => filterPromotions(promotions, { search, state }),
    [promotions, search, state],
  )

  const hasFilters = search.trim() !== '' || state !== 'all'

  const handleToggle = async (promotion: AdminPromotion) => {
    setPendingId(promotion.id)
    try {
      const updated = await togglePromotionStatus(promotion.id)
      toast.success(
        updated.isActive
          ? `"${updated.name}" esta activa`
          : `"${updated.name}" esta desactivada`,
      )
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cambiar el estado de la promocion',
      )
    } finally {
      setPendingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const { id, name } = deleteTarget
    setPendingId(id)
    try {
      await deletePromotion(id)
      setDeleteTarget(null)
      toast.success(`"${name}" se ha eliminado`)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'No se pudo eliminar la promocion',
      )
    } finally {
      setPendingId(null)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Promociones"
        description="Descuentos por porcentaje sobre el precio original. El precio del producto nunca se modifica."
        actions={
          <Button asChild>
            <Link href={adminRoutes.newPromotion}>
              <Plus className="size-4" />
              Nueva promocion
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar promocion..."
            aria-label="Buscar promocion por nombre"
            className="min-w-0 flex-1 bg-card/60"
          />
          <Select
            value={state}
            onValueChange={(value) => setState(value as StateFilter)}
          >
            <SelectTrigger
              aria-label="Filtrar por estado"
              className="w-full bg-card/60 sm:w-[11rem]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="running">Aplicandose</SelectItem>
              <SelectItem value="scheduled">Programadas</SelectItem>
              <SelectItem value="expired">Caducadas</SelectItem>
              <SelectItem value="disabled">Desactivadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'promocion' : 'promociones'}
            {filtered.length !== promotions.length && ` de ${promotions.length}`}
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
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-border bg-card/40 lg:h-16"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            filteredOut={hasFilters && promotions.length > 0}
            onReset={() => {
              setSearch('')
              setState('all')
            }}
          />
        ) : (
          <>
            {/* Escritorio */}
            <div className="hidden overflow-hidden rounded-xl border border-border bg-card/40 lg:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    {['Promocion', 'Descuento', 'Aplica a', 'Vigencia', 'Estado'].map(
                      (label) => (
                        <TableHead
                          key={label}
                          className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {label}
                        </TableHead>
                      ),
                    )}
                    <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((promotion) => {
                    const pending = pendingId === promotion.id
                    return (
                      <TableRow
                        key={promotion.id}
                        className="border-border transition-colors hover:bg-secondary/30"
                      >
                        <TableCell className="px-4 py-3">
                          <p className="font-medium text-foreground">
                            {promotion.name}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="inline-flex items-center rounded bg-foreground px-1.5 py-0.5 text-xs font-bold tabular-nums text-background">
                            {`-${promotion.discountPercent}%`}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                          {scopeLabel(promotion)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDateRange(promotion.startsAt, promotion.endsAt)}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <PromotionStateBadge state={promotion.state} />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={pending}
                              onClick={() => handleToggle(promotion)}
                              title={promotion.isActive ? 'Desactivar' : 'Activar'}
                              aria-label={
                                promotion.isActive
                                  ? `Desactivar ${promotion.name}`
                                  : `Activar ${promotion.name}`
                              }
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {pending ? (
                                <LoaderCircle className="size-4 animate-spin" />
                              ) : promotion.isActive ? (
                                <Eye className="size-4" />
                              ) : (
                                <EyeOff className="size-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={pending}
                              onClick={() =>
                                router.push(adminRoutes.editPromotion(promotion.id))
                              }
                              title="Editar"
                              aria-label={`Editar ${promotion.name}`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={pending}
                              onClick={() => setDeleteTarget(promotion)}
                              title="Eliminar"
                              aria-label={`Eliminar ${promotion.name}`}
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

            {/* Movil y tablet */}
            <div className="space-y-3 lg:hidden">
              {filtered.map((promotion) => {
                const pending = pendingId === promotion.id
                return (
                  <article
                    key={promotion.id}
                    className="rounded-xl border border-border bg-card/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate font-medium text-foreground">
                        {promotion.name}
                      </p>
                      <span className="shrink-0 rounded bg-foreground px-1.5 py-0.5 text-xs font-bold tabular-nums text-background">
                        {`-${promotion.discountPercent}%`}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {scopeLabel(promotion)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateRange(promotion.startsAt, promotion.endsAt)}
                    </p>

                    <div className="mt-3">
                      <PromotionStateBadge state={promotion.state} />
                    </div>

                    <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          router.push(adminRoutes.editPromotion(promotion.id))
                        }
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => setDeleteTarget(promotion)}
                        className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="size-3.5" />
                        Eliminar
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={pending}
                        onClick={() => handleToggle(promotion)}
                        title={promotion.isActive ? 'Desactivar' : 'Activar'}
                        aria-label={
                          promotion.isActive
                            ? `Desactivar ${promotion.name}`
                            : `Activar ${promotion.name}`
                        }
                      >
                        {pending ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : promotion.isActive ? (
                          <Eye className="size-3.5" />
                        ) : (
                          <EyeOff className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="¿Estas seguro de eliminar esta promocion?"
        description={
          deleteTarget
            ? `Se eliminara "${deleteTarget.name}". Los productos volveran a mostrar su precio original, que nunca fue modificado. Esta accion no se puede deshacer.`
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
  filteredOut,
  onReset,
}: {
  filteredOut: boolean
  onReset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/20 px-6 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground">
        {filteredOut ? (
          <SearchX className="size-5" />
        ) : (
          <TicketPercent className="size-5" />
        )}
      </span>
      <p className="mt-4 font-medium text-foreground">
        {filteredOut
          ? 'Ninguna promocion coincide con los filtros'
          : 'Todavia no hay promociones'}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filteredOut
          ? 'Prueba con otra busqueda o quita los filtros.'
          : 'Crea una para aplicar descuentos sin tocar los precios de los productos.'}
      </p>
      <div className="mt-5">
        {filteredOut ? (
          <Button variant="outline" onClick={onReset}>
            Quitar filtros
          </Button>
        ) : (
          <Button asChild>
            <Link href={adminRoutes.newPromotion}>
              <Plus className="size-4" />
              Nueva promocion
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
