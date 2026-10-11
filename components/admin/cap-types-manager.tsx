'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  LoaderCircle,
  Pencil,
  Plus,
  Tags,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import * as capTypesService from '@/lib/admin/cap-types-service'
import type { AdminCapType } from '@/lib/admin/types'
import { CAP_SECTION_SLUG, CAP_TYPE_NAME_MAX } from '@/lib/caps/cap-types'
import { ConfirmDialog } from './confirm-dialog'
import { useProducts } from './products-provider'

/**
 * Tipos de gorra (Beisbolera, Cerrada...): crear, renombrar, activar o
 * desactivar y eliminar. Vive en la pagina de Gorras del panel.
 *
 * El tipo de cada gorra se asigna en su formulario de producto. Un tipo con
 * gorras asignadas no se puede eliminar, pero si desactivar: deja de salir en
 * el filtro de la tienda y en el formulario, y las gorras lo conservan.
 *
 * Los tipos marcados con "tallas cerradas" controlan la Guia de tallas: la
 * tienda la muestra solo mientras alguno de ellos este activo.
 */
export function CapTypesManager() {
  const { products } = useProducts()
  const [capTypes, setCapTypes] = useState<AdminCapType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  // Dialogo de crear/editar: undefined = cerrado, null = tipo nuevo.
  const [editing, setEditing] = useState<AdminCapType | null | undefined>(
    undefined,
  )
  const [deleting, setDeleting] = useState<AdminCapType | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      setCapTypes(await capTypesService.getCapTypes())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los tipos de gorra',
      )
    }
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      await load()
      if (active) setIsLoading(false)
    })()
    return () => {
      active = false
    }
  }, [load])

  const caps = products.filter((p) => p.categoryId === CAP_SECTION_SLUG)
  const withoutType = caps.filter((p) => p.capTypeId === null).length
  // Gorras de un tipo con tallas cerradas pero sin ninguna talla: la Guia de
  // tallas nunca las podria mostrar.
  const fittedIds = new Set(
    capTypes.filter((t) => t.usesFittedSizes).map((t) => t.id),
  )
  const fittedWithoutSizes = caps.filter(
    (p) => p.capTypeId !== null && fittedIds.has(p.capTypeId) && p.sizes.length === 0,
  ).length
  const guideVisible = capTypes.some((t) => t.isActive && t.usesFittedSizes)

  const handleToggle = async (capType: AdminCapType) => {
    setPendingId(capType.id)
    try {
      const updated = await capTypesService.updateCapType(capType.id, {
        isActive: !capType.isActive,
      })
      setCapTypes((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      toast.success(
        updated.isActive
          ? `"${updated.name}" esta activo`
          : `"${updated.name}" esta desactivado`,
      )
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'No se pudo cambiar el estado',
      )
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setIsDeleting(true)
    try {
      await capTypesService.deleteCapType(deleting.id)
      setCapTypes((current) => current.filter((item) => item.id !== deleting.id))
      toast.success(`"${deleting.name}" se ha eliminado`)
      setDeleting(null)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'No se pudo eliminar el tipo',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-border bg-card/40 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/60 text-muted-foreground">
            <Tags className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Tipos de gorra
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Son el filtro de la seccion Gorras en la tienda. El tipo de cada
              gorra se elige en su formulario de producto.
            </p>
            {!isLoading && !error && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Guia de tallas en la tienda:{' '}
                <span
                  className={cn(
                    'font-medium',
                    guideVisible ? 'text-emerald-400' : 'text-foreground',
                  )}
                >
                  {guideVisible ? 'visible' : 'oculta'}
                </span>
                {guideVisible
                  ? ' (hay un tipo con tallas cerradas activo).'
                  : ' (ningun tipo activo usa tallas cerradas).'}
              </p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing(null)}
          className="self-start"
        >
          <Plus className="size-4" />
          Nuevo tipo
        </Button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="mt-4 space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg border border-border bg-card/40"
            />
          ))}
        </div>
      ) : capTypes.length === 0 ? (
        !error && (
          <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Todavia no hay tipos de gorra. Crea el primero.
          </p>
        )
      ) : (
        <ul className="mt-4 space-y-2">
          {capTypes.map((capType) => {
            const pending = pendingId === capType.id
            return (
              <li
                key={capType.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border border-border px-3 py-2.5',
                  capType.isActive ? 'bg-card/60' : 'bg-card/20',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-sm font-medium',
                      capType.isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    {capType.name}
                    {capType.usesFittedSizes && (
                      <span className="ml-2 rounded border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-400">
                        Tallas cerradas
                      </span>
                    )}
                    {!capType.isActive && (
                      <span className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Inactivo
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {capType.productCount}{' '}
                    {capType.productCount === 1
                      ? 'gorra asignada'
                      : 'gorras asignadas'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {pending && (
                    <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(capType)}
                    aria-label={`Editar ${capType.name}`}
                    title="Editar"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(capType)}
                    aria-label={`Eliminar ${capType.name}`}
                    title={
                      capType.productCount > 0
                        ? 'Tiene gorras asignadas: desactivalo en su lugar'
                        : 'Eliminar'
                    }
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <Switch
                    checked={capType.isActive}
                    disabled={pending}
                    onCheckedChange={() => void handleToggle(capType)}
                    aria-label={
                      capType.isActive
                        ? `Desactivar ${capType.name}`
                        : `Activar ${capType.name}`
                    }
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {withoutType > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-amber-300/80">
          {withoutType === 1
            ? '1 gorra no tiene tipo asignado'
            : `${withoutType} gorras no tienen tipo asignado`}
          : en la tienda solo aparecen con el filtro &quot;Todas&quot;. Editalas
          para elegir su tipo.
        </p>
      )}

      {fittedWithoutSizes > 0 && (
        <p className="mt-2 text-xs leading-relaxed text-amber-300/80">
          {fittedWithoutSizes === 1
            ? '1 gorra de tallas cerradas no tiene tallas'
            : `${fittedWithoutSizes} gorras de tallas cerradas no tienen tallas`}
          : la Guia de tallas no las mostrara. Editalas y anade sus tallas (7
          1/4, 7 3/8...).
        </p>
      )}

      <CapTypeFormDialog
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        capType={editing ?? null}
        onSaved={() => void load()}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && !isDeleting && setDeleting(null)}
        title={`Eliminar "${deleting?.name ?? ''}"`}
        description={
          deleting && deleting.productCount > 0
            ? `Este tipo tiene ${deleting.productCount} ${deleting.productCount === 1 ? 'gorra asignada' : 'gorras asignadas'}, asi que no se puede eliminar. Cambiales el tipo o desactivalo para quitarlo de la tienda.`
            : 'El tipo desaparece del filtro de la tienda y del panel. Esta accion no se puede deshacer.'
        }
        confirmLabel="Eliminar"
        destructive
        isPending={isDeleting}
        onConfirm={() => void handleDelete()}
      />
    </section>
  )
}

/** Crear o editar un tipo de gorra. */
function CapTypeFormDialog({
  open,
  onOpenChange,
  capType,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tipo a editar; sin el, el dialogo crea uno nuevo. */
  capType: AdminCapType | null
  onSaved: () => void
}) {
  const isEdit = capType !== null
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [usesFittedSizes, setUsesFittedSizes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(capType?.name ?? '')
    setIsActive(capType?.isActive ?? true)
    setUsesFittedSizes(capType?.usesFittedSizes ?? false)
    setError(null)
  }, [open, capType])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (name.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres')
      return
    }

    setIsSaving(true)
    try {
      const input = { name: name.trim(), isActive, usesFittedSizes }
      const saved = isEdit
        ? await capTypesService.updateCapType(capType.id, input)
        : await capTypesService.createCapType(input)
      toast.success(
        isEdit
          ? `"${saved.name}" se ha actualizado`
          : `"${saved.name}" se ha creado`,
      )
      onSaved()
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.fieldErrors?.name ?? err.message)
        toast.error(err.message)
      } else {
        toast.error('No se pudo guardar el tipo de gorra')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? 'Editar tipo de gorra' : 'Nuevo tipo de gorra'}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'El nuevo nombre se ve en la tienda en la siguiente carga.'
                : 'Si esta activo, aparece como filtro en la seccion Gorras de la tienda.'}
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="cap-type-name" className="mb-2">
              Nombre
            </Label>
            <Input
              id="cap-type-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              placeholder="Trucker"
              maxLength={CAP_TYPE_NAME_MAX}
              autoFocus
              aria-invalid={Boolean(error)}
              className="bg-background/60"
            />
            {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/40 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Activo</p>
              <p className="text-xs text-muted-foreground">
                Inactivo: sale del filtro de la tienda y no se puede asignar.
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isSaving}
              aria-label="Activo"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/40 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">
                Usa tallas cerradas
              </p>
              <p className="text-xs text-muted-foreground">
                Se vende por talla (7 1/4, 7 3/8...). Mientras este activo, la
                tienda muestra la Guia de tallas y filtra estas gorras por talla.
              </p>
            </div>
            <Switch
              checked={usesFittedSizes}
              onCheckedChange={setUsesFittedSizes}
              disabled={isSaving}
              aria-label="Usa tallas cerradas"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <LoaderCircle className="size-4 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear tipo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
