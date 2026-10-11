'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ExternalLink,
  Eye,
  EyeOff,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { adminRoutes } from '@/lib/admin/routes'
import * as sectionsService from '@/lib/admin/sections-service'
import type { AdminStoreSection } from '@/lib/admin/types'
import { AdminPageHeader } from './admin-page-header'
import { useCategories } from './categories-provider'
import { getCategoryIcon } from './category-icons'
import { ConfirmDialog } from './confirm-dialog'
import { SectionFormDialog } from './section-form-dialog'

/**
 * Secciones de tienda: crea, edita, elimina y decide que categorias ve el
 * cliente.
 *
 * Cada cambio se guarda en PostgreSQL al instante a traves de la API, y la
 * respuesta del servidor es la que actualiza la fila, no una suposicion del
 * cliente. Despues se refresca el proveedor de categorias para que el menu
 * lateral y el formulario de producto vean el cambio sin recargar.
 */
export function SectionsView() {
  const [sections, setSections] = useState<AdminStoreSection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingSlug, setPendingSlug] = useState<string | null>(null)
  const { refresh: refreshCategories } = useCategories()
  // Dialogo de crear/editar: undefined = cerrado, null = nueva seccion.
  const [editing, setEditing] = useState<AdminStoreSection | null | undefined>(
    undefined,
  )
  const [deleting, setDeleting] = useState<AdminStoreSection | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      setSections(await sectionsService.getSections())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las secciones',
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

  const handleToggle = async (section: AdminStoreSection) => {
    setPendingSlug(section.slug)
    try {
      const updated = await sectionsService.setSectionVisibility(
        section.slug,
        !section.isVisible,
      )
      // Se aplica lo que confirma el servidor.
      setSections((current) =>
        current.map((item) => (item.slug === updated.slug ? updated : item)),
      )
      void refreshCategories()
      toast.success(
        updated.isVisible
          ? `"${updated.name}" ya se ve en la tienda`
          : `"${updated.name}" ya no se ve en la tienda`,
      )
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cambiar la visibilidad',
      )
    } finally {
      setPendingSlug(null)
    }
  }

  /** Tras crear o editar: se recarga la lista (el orden es por nombre). */
  const handleSaved = async () => {
    await Promise.all([load(), refreshCategories()])
  }

  const handleDelete = async () => {
    if (!deleting) return
    setIsDeleting(true)
    try {
      await sectionsService.deleteSection(deleting.slug)
      setSections((current) =>
        current.filter((item) => item.slug !== deleting.slug),
      )
      void refreshCategories()
      toast.success(`"${deleting.name}" se ha eliminado`)
      setDeleting(null)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'No se pudo eliminar la seccion',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const visibleCount = sections.filter((s) => s.isVisible).length
  const noneVisible = !isLoading && sections.length > 0 && visibleCount === 0

  return (
    <>
      <AdminPageHeader
        title="Secciones de tienda"
        description="Crea, edita y elige que categorias ven los clientes. Ocultar una seccion no borra ni desactiva sus productos: siguen aqui y puedes volver a mostrarla cuando quieras."
        actions={
          <>
            <Button
              asChild
              variant="outline"
              className="text-muted-foreground hover:text-foreground"
            >
              <Link href={adminRoutes.storefront} target="_blank">
                <ExternalLink className="size-4" />
                Ver tienda
              </Link>
            </Button>
            <Button onClick={() => setEditing(null)}>
              <Plus className="size-4" />
              Nueva seccion
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            {visibleCount} de {sections.length}{' '}
            {sections.length === 1 ? 'seccion visible' : 'secciones visibles'}
          </p>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {noneVisible && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p className="leading-relaxed">
              No hay ninguna seccion visible: la tienda se ve vacia para los
              clientes. Activa al menos una.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-border bg-card/40"
              />
            ))}
          </div>
        ) : (
          <ul className="space-y-3">
            {sections.map((section, index) => {
              const Icon = getCategoryIcon(section.slug)
              const pending = pendingSlug === section.slug
              const emptyButVisible =
                section.isVisible && section.activeProductCount === 0

              return (
                <motion.li
                  key={section.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: 'easeOut',
                  }}
                  className={cn(
                    'rounded-xl border bg-card/60 p-4 transition-colors sm:p-5',
                    section.isVisible
                      ? 'border-border'
                      : 'border-border bg-card/30',
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Identidad */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-lg border',
                          section.isVisible
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-border bg-secondary/60 text-muted-foreground',
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'truncate font-medium',
                            section.isVisible
                              ? 'text-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          {section.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          /{section.slug} · {section.activeProductCount} de{' '}
                          {section.productCount}{' '}
                          {section.productCount === 1
                            ? 'producto activo'
                            : 'productos activos'}
                        </p>
                      </div>
                    </div>

                    {/* Estado y control */}
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium',
                          section.isVisible
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-border bg-muted text-muted-foreground',
                        )}
                      >
                        {section.isVisible ? (
                          <Eye className="size-3" />
                        ) : (
                          <EyeOff className="size-3" />
                        )}
                        {section.isVisible ? 'Visible' : 'Oculta'}
                      </span>

                      <div className="flex shrink-0 items-center gap-2">
                        {pending && (
                          <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                        )}
                        <button
                          type="button"
                          onClick={() => setEditing(section)}
                          aria-label={`Editar ${section.name}`}
                          title="Editar"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(section)}
                          aria-label={`Eliminar ${section.name}`}
                          title={
                            section.productCount > 0
                              ? 'Tiene productos: muevelos antes de eliminarla'
                              : 'Eliminar'
                          }
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        <Switch
                          checked={section.isVisible}
                          disabled={pending}
                          onCheckedChange={() => handleToggle(section)}
                          aria-label={
                            section.isVisible
                              ? `Ocultar ${section.name} de la tienda`
                              : `Mostrar ${section.name} en la tienda`
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Avisos por fila */}
                  {!section.isVisible && section.activeProductCount > 0 && (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {section.activeProductCount}{' '}
                      {section.activeProductCount === 1
                        ? 'producto activo esta oculto'
                        : 'productos activos estan ocultos'}{' '}
                      para los clientes. La direccion /{section.slug} devuelve
                      404 mientras la seccion este oculta.
                    </p>
                  )}
                  {emptyButVisible && (
                    <p className="mt-3 text-xs leading-relaxed text-amber-300/80">
                      Esta seccion esta visible pero no tiene productos activos:
                      el cliente la vera vacia.
                    </p>
                  )}
                </motion.li>
              )
            })}
          </ul>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Cada seccion es tambien una categoria del panel: aparece en el menu
          lateral y en el formulario de producto aunque este oculta, para que
          puedas seguir administrando sus productos. Solo se pueden eliminar las
          secciones sin productos.
        </p>
      </div>

      <SectionFormDialog
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        section={editing ?? null}
        onSaved={() => void handleSaved()}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && !isDeleting && setDeleting(null)}
        title={`Eliminar "${deleting?.name ?? ''}"`}
        description={
          deleting && deleting.productCount > 0
            ? `Esta seccion tiene ${deleting.productCount} ${deleting.productCount === 1 ? 'producto' : 'productos'}. Muevelos a otra seccion (editando cada producto) o eliminalos antes de borrarla.`
            : 'La seccion desaparece de la tienda y del panel. Esta accion no se puede deshacer.'
        }
        confirmLabel="Eliminar"
        destructive
        isPending={isDeleting}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
