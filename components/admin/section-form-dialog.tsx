'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle, Lock } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'
import * as sectionsService from '@/lib/admin/sections-service'
import type { AdminStoreSection } from '@/lib/admin/types'
import { sectionSlugError, slugifySection } from '@/lib/sections'

type FieldErrors = Partial<Record<'name' | 'slug' | 'description', string>>

/**
 * Crear o editar una seccion de tienda.
 *
 * El identificador (slug) es opcional al crear: mientras no se toque, sigue al
 * nombre. Es la direccion publica de la seccion (/slug), por eso se avisa al
 * cambiarlo y las secciones de siempre lo tienen bloqueado.
 */
export function SectionFormDialog({
  open,
  onOpenChange,
  section,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Seccion a editar; sin ella el dialogo crea una nueva. */
  section: AdminStoreSection | null
  onSaved: (saved: AdminStoreSection) => void
}) {
  const isEdit = section !== null
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  // Cada apertura parte de los datos actuales de la seccion (o en blanco).
  useEffect(() => {
    if (!open) return
    setName(section?.name ?? '')
    setSlug(section?.slug ?? '')
    setSlugTouched(isEdit)
    setDescription(section?.description ?? '')
    setIsVisible(section?.isVisible ?? true)
    setErrors({})
  }, [open, section, isEdit])

  const slugLocked = section?.isBuiltIn ?? false
  const effectiveSlug = slugTouched ? slug : slugifySection(name)
  const slugChanged = isEdit && effectiveSlug !== section.slug

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: FieldErrors = {}
    if (name.trim().length < 2) {
      nextErrors.name = 'El nombre debe tener al menos 2 caracteres'
    }
    const slugError = effectiveSlug ? sectionSlugError(effectiveSlug) : null
    if (slugError) nextErrors.slug = slugError
    if (!effectiveSlug && slugTouched) {
      nextErrors.slug = 'El identificador no puede estar vacio'
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsSaving(true)
    try {
      const input = {
        name: name.trim(),
        description: description.trim(),
        isVisible,
        // Al crear, sin slug propio la API lo deriva del nombre.
        ...(effectiveSlug && !slugLocked && { slug: effectiveSlug }),
      }
      const saved = isEdit
        ? await sectionsService.updateSection(section.slug, input)
        : await sectionsService.createSection(input)
      toast.success(
        isEdit
          ? `"${saved.name}" se ha actualizado`
          : `"${saved.name}" se ha creado`,
      )
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) setErrors(err.fieldErrors as FieldErrors)
        toast.error(err.message)
      } else {
        toast.error('No se pudo guardar la seccion')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar seccion' : 'Nueva seccion'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Los cambios se ven en la tienda en la siguiente carga.'
                : 'La seccion queda disponible para asignarle productos y, si esta visible, aparece en la tienda.'}
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="section-name" className="mb-2">
              Nombre
            </Label>
            <Input
              id="section-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setErrors((e) => ({ ...e, name: undefined }))
              }}
              placeholder="Accesorios"
              maxLength={40}
              autoFocus
              aria-invalid={Boolean(errors.name)}
              className="bg-background/60"
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-red-400">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="section-slug" className="mb-2">
              Identificador{' '}
              <span className="font-normal text-muted-foreground">
                {slugLocked ? '(fijo)' : '(opcional)'}
              </span>
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                /
              </span>
              <Input
                id="section-slug"
                value={effectiveSlug}
                disabled={slugLocked}
                onChange={(event) => {
                  setSlugTouched(true)
                  setSlug(event.target.value.toLowerCase().replace(/\s+/g, '-'))
                  setErrors((e) => ({ ...e, slug: undefined }))
                }}
                placeholder="accesorios"
                maxLength={40}
                aria-invalid={Boolean(errors.slug)}
                className="bg-background/60 pl-6"
              />
              {slugLocked && (
                <Lock className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
            {errors.slug ? (
              <p className="mt-1.5 text-xs text-red-400">{errors.slug}</p>
            ) : slugLocked ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Es una seccion de siempre: su direccion no se puede cambiar.
              </p>
            ) : slugChanged ? (
              <p className="mt-1.5 text-xs text-amber-300/80">
                La direccion publica pasara de /{section.slug} a /
                {effectiveSlug}. Los enlaces antiguos dejaran de funcionar.
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Direccion de la seccion en la tienda. Si lo dejas, se genera a
                partir del nombre.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="section-description" className="mb-2">
              Descripcion{' '}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <Textarea
              id="section-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Texto corto que acompana a la seccion en la portada."
              rows={3}
              maxLength={300}
              aria-invalid={Boolean(errors.description)}
              className="resize-y bg-background/60"
            />
            {errors.description ? (
              <p className="mt-1.5 text-xs text-red-400">
                {errors.description}
              </p>
            ) : (
              section?.isBuiltIn && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Vacia = la tienda usa el texto de siempre de esta seccion.
                </p>
              )
            )}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/40 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">
                Visible en la tienda
              </p>
              <p className="text-xs text-muted-foreground">
                Oculta, sigue disponible en el panel para sus productos.
              </p>
            </div>
            <Switch
              checked={isVisible}
              onCheckedChange={setIsVisible}
              disabled={isSaving}
              aria-label="Visible en la tienda"
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
              {isEdit ? 'Guardar cambios' : 'Crear seccion'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
