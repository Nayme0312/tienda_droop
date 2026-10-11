'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ExternalLink,
  LoaderCircle,
  PartyPopper,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { adminRoutes } from '@/lib/admin/routes'
import * as specialDatesService from '@/lib/admin/special-dates-service'
import type { AdminSpecialDate } from '@/lib/admin/types'
import { AdminPageHeader } from './admin-page-header'

/**
 * Fechas especiales: temporadas que cambian el aspecto de la tienda publica.
 *
 * Mismo patron que Secciones de tienda: estado local a la pagina, cada cambio
 * se guarda en PostgreSQL al instante y la lista se vuelve a pedir al servidor
 * (al activar una temporada, la API desactiva las demas).
 */
export function SpecialDatesView() {
  const router = useRouter()
  const [specialDates, setSpecialDates] = useState<AdminSpecialDate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingSlug, setPendingSlug] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      setSpecialDates(await specialDatesService.getSpecialDates())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las fechas especiales',
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

  const handleToggle = async (specialDate: AdminSpecialDate) => {
    setPendingSlug(specialDate.slug)
    try {
      const updated = await specialDatesService.setSpecialDateActive(
        specialDate.slug,
        !specialDate.isActive,
      )
      await load()
      // La temporada se lee en el layout raiz: refrescarlo hace que "Ver
      // tienda" muestre ya el cambio sin recargar la pagina.
      router.refresh()
      toast.success(
        updated.isActive
          ? `"${updated.name}" ya esta activa en la tienda`
          : `"${updated.name}" se ha desactivado`,
      )
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cambiar la fecha especial',
      )
    } finally {
      setPendingSlug(null)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Fechas especiales"
        description="Activa una temporada para darle a la tienda un ambiente especial. Solo cambia el aspecto: productos, precios, promociones y pagos siguen igual. Solo puede haber una activa a la vez."
        actions={
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
        }
      />

      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="h-24 animate-pulse rounded-xl border border-border bg-card/40" />
        ) : (
          <ul className="space-y-3">
            {specialDates.map((specialDate, index) => {
              const pending = pendingSlug === specialDate.slug

              return (
                <motion.li
                  key={specialDate.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: 'easeOut',
                  }}
                  className={cn(
                    'rounded-xl border bg-card/60 p-4 transition-colors sm:p-5',
                    specialDate.isActive
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
                          specialDate.isActive
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-border bg-secondary/60 text-muted-foreground',
                        )}
                      >
                        <PartyPopper className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Fecha especial
                        </p>
                        <p
                          className={cn(
                            'truncate font-medium',
                            specialDate.isActive
                              ? 'text-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          {specialDate.name}
                        </p>
                      </div>
                    </div>

                    {/* Estado y control */}
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span
                        className={cn(
                          'inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium',
                          specialDate.isActive
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-border bg-muted text-muted-foreground',
                        )}
                      >
                        {specialDate.isActive ? 'Activa' : 'Inactiva'}
                      </span>

                      <div className="flex shrink-0 items-center gap-2">
                        {pending && (
                          <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                        )}
                        <Switch
                          checked={specialDate.isActive}
                          disabled={pendingSlug !== null}
                          onCheckedChange={() => handleToggle(specialDate)}
                          aria-label={
                            specialDate.isActive
                              ? `Desactivar ${specialDate.name}`
                              : `Activar ${specialDate.name}`
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {specialDate.description}
                  </p>
                </motion.li>
              )
            })}
          </ul>
        )}

        {!isLoading && !error && specialDates.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay fechas especiales configuradas. Aplica las migraciones de la
            base de datos (npm run db:deploy) para crear Navidad.
          </p>
        )}
      </div>
    </>
  )
}
