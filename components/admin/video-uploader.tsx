'use client'

import { useId, useRef, useState } from 'react'
import { Film, RefreshCw, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/admin/format'
import type { ImageDraft } from '@/lib/admin/types'

/** Debe coincidir con MAX_VIDEO_BYTES (lib/storage/uploads.ts). */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024
const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

/**
 * Selector del video del producto, con previsualizacion local.
 *
 * Mismo planteamiento que ImageUploader: el archivo elegido se previsualiza con
 * una URL temporal (blob:) y el formulario lo sube al guardar. Un solo video
 * por producto: elegir otro lo sustituye y la X lo quita.
 */
export function VideoUploader({
  label,
  hint,
  value,
  onChange,
  error,
  disabled = false,
}: {
  label: string
  hint?: string
  value: ImageDraft | null
  onChange: (draft: ImageDraft | null) => void
  error?: string
  disabled?: boolean
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const release = (draft: ImageDraft | null) => {
    if (draft?.file) URL.revokeObjectURL(draft.url)
  }

  const pickFile = (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError('Formato no admitido. Usa MP4, MOV o WEBM.')
      return
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setLocalError(
        `El video pesa ${formatFileSize(file.size)}. El maximo es ${formatFileSize(MAX_VIDEO_BYTES)}.`,
      )
      return
    }
    setLocalError(null)
    release(value)
    onChange({
      url: URL.createObjectURL(file),
      file,
      name: file.name,
      size: file.size,
    })
  }

  const remove = () => {
    release(value)
    setLocalError(null)
    onChange(null)
  }

  const shownError = localError ?? error

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        disabled={disabled}
        onChange={(event) => {
          pickFile(event.target.files)
          // Se limpia para poder volver a elegir el mismo archivo despues.
          event.target.value = ''
        }}
        className="sr-only"
      />

      <div
        onDragOver={(event) => {
          if (disabled) return
          event.preventDefault()
          setIsDraggingOver(true)
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(event) => {
          if (disabled) return
          event.preventDefault()
          setIsDraggingOver(false)
          pickFile(event.dataTransfer.files)
        }}
        className={cn(
          'rounded-xl border border-dashed p-4 transition-colors duration-200',
          isDraggingOver
            ? 'border-foreground/50 bg-secondary/60'
            : 'border-border bg-card/30',
          shownError && 'border-red-500/40',
          disabled && 'opacity-60',
        )}
      >
        {value ? (
          <div className="space-y-3">
            <video
              key={value.url}
              src={value.url}
              controls
              muted
              playsInline
              preload="metadata"
              className="aspect-video w-full rounded-lg border border-border bg-black object-contain"
            />
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background/60 p-2">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
                <Film className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {value.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {value.size !== undefined
                    ? formatFileSize(value.size)
                    : 'Video existente'}
                </p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                aria-label="Cambiar video"
                title="Cambiar video"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none"
              >
                <RefreshCw className="size-4" />
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={remove}
                aria-label="Quitar video"
                title="Quitar video"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:pointer-events-none"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg py-4 text-center transition-colors hover:bg-secondary/40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <span className="flex size-10 items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground">
              <Upload className="size-4" />
            </span>
            <span className="text-sm font-medium text-foreground">
              Seleccionar desde el computador
            </span>
            <span className="text-xs text-muted-foreground">
              O arrastra el archivo aqui · MP4, MOV, WEBM · max.{' '}
              {formatFileSize(MAX_VIDEO_BYTES)}
            </span>
          </button>
        )}
      </div>

      {shownError && <p className="text-xs text-red-400">{shownError}</p>}
    </div>
  )
}
