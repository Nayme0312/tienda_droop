'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ExternalLink,
  Film,
  ImageIcon,
  LoaderCircle,
  MonitorPlay,
  Save,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { adminRoutes } from '@/lib/admin/routes'
import * as heroService from '@/lib/admin/hero-service'
import { uploadProductImage } from '@/lib/admin/products-service'
import type { AdminHero, ImageDraft } from '@/lib/admin/types'
import { AdminPageHeader } from './admin-page-header'
import { ImageUploader } from './image-uploader'
import { VideoUploader } from './video-uploader'

type MediaType = AdminHero['mediaType']

function draftFromUrl(url: string | null): ImageDraft | null {
  if (!url) return null
  return { url, name: url.split('/').pop() || url }
}

/**
 * Hero de la portada: video o imagen, y activacion.
 *
 * Video e imagen se guardan los dos (se puede alternar sin volver a subir) y
 * `mediaType` decide cual muestra la tienda. Los archivos nuevos se suben al
 * pulsar Guardar, igual que en el formulario de producto.
 */
export function HeroView() {
  const router = useRouter()
  const [mediaType, setMediaType] = useState<MediaType>('video')
  const [video, setVideo] = useState<ImageDraft | null>(null)
  const [image, setImage] = useState<ImageDraft[]>([])
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const apply = (hero: AdminHero) => {
    setMediaType(hero.mediaType)
    setVideo(draftFromUrl(hero.videoUrl))
    const imageDraft = draftFromUrl(hero.imageUrl)
    setImage(imageDraft ? [imageDraft] : [])
    setIsActive(hero.isActive)
    setIsDirty(false)
  }

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      apply(await heroService.getHero())
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'No se pudo cargar el Hero',
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

  /** Envuelve un setter para marcar el formulario como modificado. */
  const touch =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setIsDirty(true)
      setFieldErrors({})
    }

  const handleSave = async () => {
    const chosen = mediaType === 'video' ? video : image[0]
    if (isActive && !chosen) {
      setFieldErrors(
        mediaType === 'video'
          ? { videoUrl: 'Sube un video para el Hero' }
          : { imageUrl: 'Sube una imagen para el Hero' },
      )
      toast.error('Falta el archivo del medio elegido')
      return
    }

    setIsSaving(true)
    try {
      // Sube lo nuevo antes de guardar; lo que ya estaba guardado se deja tal
      // cual. Si despues falla el guardado, el reintento no vuelve a subirlo.
      let videoUrl = video?.url ?? null
      if (video?.file) {
        videoUrl = await uploadProductImage(video.file)
        setVideo({ url: videoUrl, name: video.name })
      }
      let imageUrl = image[0]?.url ?? null
      if (image[0]?.file) {
        imageUrl = await uploadProductImage(image[0].file)
        setImage([{ url: imageUrl, name: image[0].name }])
      }

      const saved = await heroService.saveHero({
        mediaType,
        videoUrl,
        imageUrl,
        isActive,
      })
      apply(saved)
      router.refresh()
      toast.success(
        saved.isActive
          ? `Hero guardado: la tienda muestra ${saved.mediaType === 'video' ? 'el video' : 'la imagen'}`
          : 'Hero guardado: esta oculto en la tienda',
      )
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) setFieldErrors(err.fieldErrors)
        toast.error(err.message)
      } else {
        toast.error('No se pudo guardar el Hero')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const previewSrc = mediaType === 'video' ? video?.url : image[0]?.url

  return (
    <>
      <AdminPageHeader
        title="Hero de portada"
        description="El bloque principal con el que abre la tienda. Sube un video, una imagen o ambos, elige cual se muestra y guarda los cambios."
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
                  <MonitorPlay className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    Mostrar en la tienda
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Si lo desactivas, la portada empieza directamente por el
                    catalogo.
                  </p>
                </div>
              </div>
              <Switch
                checked={isActive}
                disabled={isSaving}
                onCheckedChange={touch(setIsActive)}
                aria-label={isActive ? 'Desactivar Hero' : 'Activar Hero'}
              />
            </div>

            {/* Que se muestra */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Mostrar en el Hero
              </p>
              <div
                role="radiogroup"
                aria-label="Medio del Hero"
                className="grid grid-cols-2 gap-2"
              >
                {(
                  [
                    { value: 'video', label: 'Video', icon: Film },
                    { value: 'image', label: 'Imagen', icon: ImageIcon },
                  ] as const
                ).map((option) => {
                  const selected = mediaType === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={isSaving}
                      onClick={() => touch(setMediaType)(option.value)}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-60',
                        selected
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-background/60 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <option.icon className="size-4" />
                      {option.label}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                El otro archivo se conserva: puedes volver a el cuando quieras
                sin subirlo de nuevo.
              </p>
            </div>

            {/* Archivos */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <VideoUploader
                label="Video del Hero"
                hint="Avanza con el scroll de la pagina. Recomendado: horizontal (16:9), MP4."
                value={video}
                onChange={touch(setVideo)}
                error={fieldErrors.videoUrl}
                disabled={isSaving}
              />
              <ImageUploader
                label="Imagen del Hero"
                hint="Recomendado: horizontal (16:9), al menos 1920 px de ancho."
                value={image}
                onChange={touch(setImage)}
                max={1}
                error={fieldErrors.imageUrl}
                disabled={isSaving}
              />
            </div>

            {/* Vista previa del medio elegido */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Vista previa
              </p>
              <div
                className={cn(
                  'relative aspect-video overflow-hidden rounded-lg border border-border bg-black',
                  !isActive && 'opacity-40',
                )}
              >
                {previewSrc ? (
                  mediaType === 'video' ? (
                    <video
                      key={previewSrc}
                      src={previewSrc}
                      muted
                      loop
                      autoPlay
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={previewSrc}
                      alt="Vista previa del Hero"
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <p className="flex h-full items-center justify-center px-4 text-center text-xs text-white/60">
                    {mediaType === 'video'
                      ? 'Sube un video para verlo aqui.'
                      : 'Sube una imagen para verla aqui.'}
                  </p>
                )}
              </div>
            </div>

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
