'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Entrada de valores cortos en forma de etiquetas: tallas y colores.
 *
 * Se anade con Enter o con el boton, y se quita con la X. Los valores repetidos
 * se ignoran para que no lleguen duplicados a la base de datos.
 */
export function TagInput({
  values,
  onChange,
  placeholder,
  suggestions = [],
  max = 20,
  disabled = false,
  error,
  'aria-label': ariaLabel,
}: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  /** Valores frecuentes que se ofrecen como atajo. */
  suggestions?: string[]
  max?: number
  disabled?: boolean
  error?: string
  'aria-label'?: string
}) {
  const [draft, setDraft] = useState('')

  const add = (raw: string) => {
    const value = raw.trim()
    if (!value) return
    if (values.length >= max) return
    // Comparacion sin distinguir mayusculas para no duplicar "Negro" y "negro".
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...values, value])
    setDraft('')
  }

  const remove = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  const pending = suggestions.filter(
    (s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()),
  )

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              // Sin esto, Enter enviaria el formulario entero.
              event.preventDefault()
              add(draft)
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          disabled={disabled || values.length >= max}
          className="bg-card/60"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => add(draft)}
          disabled={disabled || !draft.trim() || values.length >= max}
          aria-label="Anadir"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {values.map((value, index) => (
            <li key={`${value}-${index}`}>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 py-1 pl-2.5 pr-1 text-xs font-medium text-foreground">
                {value}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={disabled}
                  aria-label={`Quitar ${value}`}
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:text-red-400 disabled:pointer-events-none"
                >
                  <X className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && values.length < max && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Rapido:</span>
          {pending.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => add(suggestion)}
              disabled={disabled}
              className={cn(
                'rounded border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors',
                'hover:border-foreground/40 hover:text-foreground disabled:pointer-events-none',
              )}
            >
              + {suggestion}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
