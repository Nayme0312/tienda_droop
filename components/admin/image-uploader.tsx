'use client'

import { useId, useRef, useState } from 'react'
import { ImagePlus, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/admin/format'
import type { ImageDraft } from '@/lib/admin/types'

/**
 * Selector de imagenes con previsualizacion local.
 *
 * ETAPA ACTUAL: nada se sube a ningun servidor ni servicio externo. Los
 * archivos elegidos se convierten en una URL temporal con
 * URL.createObjectURL solo para poder verlos, y el File original se conserva
 * en `ImageDraft.file`.
 *
 * ETAPA DE ALMACENAMIENTO: el unico cambio sera, al guardar el formulario,
 * enviar esos `file` al almacenamiento y sustituir `url` por la URL definitiva
 * que devuelva. La interfaz no necesita cambiar.
 *
 * Nota sobre las URLs temporales: se liberan con revokeObjectURL cuando el
 * usuario quita la imagen, pero no al desmontar el componente, porque tras
 * guardar el producto esa misma URL es la que sigue mostrando la imagen en el
 * listado. Las URLs temporales dejan de existir al recargar la pagina, igual
 * que los datos mock.
 */
export function ImageUploader({
  label,
  hint,
  value,
  onChange,
  max = 1,
  error,
  disabled = false,
}: {
  label: string
  hint?: string
  value: ImageDraft[]
  onChange: (drafts: ImageDraft[]) => void
  /** Numero maximo de imagenes. 1 = imagen principal. */
  max?: number
  error?: string
  disabled?: boolean
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const multiple = max > 1
  const isFull = value.length >= max

  const addFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    const images = Array.from(fileList).filter((file) =>
      file.type.startsWith('image/'),
    )
    if (images.length === 0) return

    const drafts: ImageDraft[] = images.map((file) => ({
      url: URL.createObjectURL(file),
      file,
      name: file.name,
      size: file.size,
    }))

    // Con max = 1 la nueva imagen sustituye a la anterior; con varias, se
    // anaden hasta llenar el hueco disponible.
    if (max === 1) {
      releaseDrafts(value)
      onChange(drafts.slice(0, 1))
      return
    }

    const room = max - value.length
    if (room <= 0) return
    onChange([...value, ...drafts.slice(0, room)])
  }

  /** Libera las URLs temporales que creo este componente. */
  const releaseDrafts = (drafts: ImageDraft[]) => {
    for (const draft of drafts) {
      if (draft.file) URL.revokeObjectURL(draft.url)
    }
  }

  const removeAt = (index: number) => {
    const target = value[index]
    if (target) releaseDrafts([target])
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
        {multiple && (
          <span className="text-xs text-muted-foreground">
            {value.length} / {max}
          </span>
        )}
      </div>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {/* Zona de seleccion */}
      <div
        onDragOver={(event) => {
          if (disabled || isFull) return
          event.preventDefault()
          setIsDraggingOver(true)
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(event) => {
          if (disabled || isFull) return
          event.preventDefault()
          setIsDraggingOver(false)
          addFiles(event.dataTransfer.files)
        }}
        className={cn(
          'rounded-xl border border-dashed p-4 transition-colors duration-200',
          isDraggingOver
            ? 'border-foreground/50 bg-secondary/60'
            : 'border-border bg-card/30',
          error && 'border-red-500/40',
          (disabled || isFull) && 'opacity-60',
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          multiple={multiple}
          disabled={disabled || isFull}
          onChange={(event) => {
            addFiles(event.target.files)
            // Se limpia para poder volver a elegir el mismo archivo despues.
            event.target.value = ''
          }}
          className="sr-only"
        />

        <button
          type="button"
          disabled={disabled || isFull}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg py-4 text-center transition-colors hover:bg-secondary/40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <span className="flex size-10 items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground">
            {isFull ? (
              <ImagePlus className="size-4" />
            ) : (
              <Upload className="size-4" />
            )}
          </span>
          <span className="text-sm font-medium text-foreground">
            {isFull
              ? max === 1
                ? 'Imagen seleccionada'
                : 'Maximo de imagenes alcanzado'
              : 'Seleccionar desde el computador'}
          </span>
          <span className="text-xs text-muted-foreground">
            {isFull
              ? 'Quita una imagen para cambiarla'
              : 'O arrastra los archivos aqui · PNG, JPG, WEBP'}
          </span>
        </button>

        {/* Previsualizaciones */}
        {value.length > 0 && (
          <ul
            className={cn(
              'mt-4 grid gap-3',
              max === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
            )}
          >
            {value.map((draft, index) => (
              <li
                key={`${draft.url}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/60 p-2"
              >
                <img
                  src={draft.url}
                  alt={draft.name}
                  className="size-14 shrink-0 rounded-md border border-border bg-secondary object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {draft.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {draft.size !== undefined
                      ? formatFileSize(draft.size)
                      : 'Imagen existente'}
                    {index === 0 && max === 1 && ' · principal'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeAt(index)}
                  aria-label={`Quitar ${draft.name}`}
                  title="Quitar imagen"
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:pointer-events-none"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
