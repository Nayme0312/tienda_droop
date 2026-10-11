'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ExternalLink,
  LoaderCircle,
  Megaphone,
  RotateCcw,
  Save,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BenefitsMarquee } from '@/components/benefits-marquee'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { adminRoutes } from '@/lib/admin/routes'
import * as marqueeService from '@/lib/admin/marquee-service'
import { MARQUEE_MAX_LENGTH, splitMarqueeText } from '@/lib/marquee/marquee'
import { AdminPageHeader } from './admin-page-header'

/**
 * Cinta marquesina de la portada: texto libre y activacion.
 *
 * A diferencia de Fechas especiales, aqui los cambios no se guardan al
 * instante: el texto se edita con calma y se guarda con el boton, junto con
 * el estado del interruptor.
 *
 * "Usar mensaje predeterminado" solo carga en el campo la plantilla guardada en
 * PostgreSQL; no se publica hasta pulsar Guardar.
 */
export function MarqueeView() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [defaultText, setDefaultText] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [saved, setSaved] = useState({ text: '', isActive: false })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const marquee = await marqueeService.getMarquee()
      setText(marquee.text)
      setDefaultText(marquee.defaultText)
      setIsActive(marquee.isActive)
      setSaved({ text: marquee.text, isActive: marquee.isActive })
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la cinta marquesina',
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

  const isDirty = text !== saved.text || isActive !== saved.isActive
  const phrases = splitMarqueeText(text)
  const isUsingDefault = defaultText !== '' && text.trim() === defaultText.trim()

  const handleUseDefault = () => {
    setText(defaultText)
    setFieldError(null)
  }

  const handleSave = async () => {
    if (phrases.length === 0) {
      setFieldError('Escribe el texto de la cinta')
      return
    }
    setFieldError(null)
    setIsSaving(true)
    try {
      const updated = await marqueeService.saveMarquee({ text, isActive })
      setText(updated.text)
      setDefaultText(updated.defaultText)
      setIsActive(updated.isActive)
      setSaved({ text: updated.text, isActive: updated.isActive })
      router.refresh()
      toast.success(
        updated.isActive
          ? 'Cinta guardada: ya se ve en la tienda'
          : 'Cinta guardada: esta oculta en la tienda',
      )
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldError(err.fieldErrors?.text ?? null)
        toast.error(err.message)
      } else {
        toast.error('No se pudo guardar la cinta marquesina')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Cinta marquesina"
        description="Texto que se desplaza bajo la portada de la tienda. Escribelo libremente, activalo o desactivalo y guarda los cambios."
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
        {loadError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>{loadError}</p>
          </div>
        )}

        {isLoading ? (
          <div className="h-64 animate-pulse rounded-xl border border-border bg-card/40" />
        ) : (
          <div className="space-y-5 rounded-xl border border-border bg-card/60 p-4 sm:p-5">
            {/* Estado */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg border',
                    isActive
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                      : 'border-border bg-secondary/60 text-muted-foreground',
                  )}
                >
                  <Megaphone className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    Mostrar en la tienda
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Si la desactivas, la cinta no aparece en la portada.
                  </p>
                </div>
              </div>
              <Switch
                checked={isActive}
                disabled={isSaving}
                onCheckedChange={setIsActive}
                aria-label={isActive ? 'Desactivar cinta' : 'Activar cinta'}
              />
            </div>

            {/* Texto */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="marquee-text">Texto de la cinta</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseDefault}
                  disabled={isSaving || !defaultText || isUsingDefault}
                >
                  <RotateCcw className="size-3.5" />
                  Usar mensaje predeterminado
                </Button>
              </div>
              <Textarea
                id="marquee-text"
                value={text}
                maxLength={MARQUEE_MAX_LENGTH}
                disabled={isSaving}
                aria-invalid={fieldError ? true : undefined}
                onChange={(event) => {
                  setText(event.target.value)
                  if (fieldError) setFieldError(null)
                }}
                placeholder="NUEVA COLECCIÓN STREETVIBE · ENVÍOS A TODO COLOMBIA · COMPRA SEGURA"
                className="min-h-24"
              />
              <div className="mt-1.5 flex items-start justify-between gap-4 text-xs">
                {fieldError ? (
                  <p className="text-red-400">{fieldError}</p>
                ) : (
                  <p className="text-muted-foreground">
                    Separa cada frase con «·». La tienda pone un separador entre
                    ellas y repite el texto en bucle.
                  </p>
                )}
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {text.length}/{MARQUEE_MAX_LENGTH}
                </span>
              </div>
            </div>

            {/* Vista previa con el mismo componente que usa la tienda */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Vista previa
              </p>
              <div
                className={cn(
                  'overflow-hidden rounded-lg border border-border',
                  !isActive && 'opacity-40',
                )}
              >
                {phrases.length > 0 ? (
                  <BenefitsMarquee text={text} />
                ) : (
                  <p className="px-4 py-4 text-center text-xs text-muted-foreground">
                    Escribe un texto para ver la cinta.
                  </p>
                )}
              </div>
            </div>

            {/* Plantilla siempre visible, aunque el mensaje activo sea otro */}
            {defaultText && (
              <div className="rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-2.5">
                <p className="text-xs font-medium text-foreground">
                  Mensaje predeterminado
                  {isUsingDefault && (
                    <span className="ml-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                      En uso
                    </span>
                  )}
                </p>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {defaultText}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!isDirty || isSaving || loadError !== null}
              >
                {isSaving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
