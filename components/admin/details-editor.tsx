'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/**
 * Editor de la ficha tecnica del producto (los pares clave-valor que la tienda
 * lista en el modal: gramaje, tipo de tela, fit...).
 *
 * Se trabaja sobre una lista de filas y no directamente sobre el objeto, porque
 * un objeto no permitiria tener una clave vacia mientras el usuario la escribe,
 * ni conservar el orden al renombrarla. La conversion a objeto se hace al
 * guardar.
 */
export interface DetailRow {
  key: string
  value: string
}

export function detailsToRows(
  details: Record<string, string>,
): DetailRow[] {
  return Object.entries(details).map(([key, value]) => ({ key, value }))
}

/** Filas -> objeto. Descarta las filas sin clave y respeta la ultima repetida. */
export function rowsToDetails(rows: DetailRow[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (!key) continue
    result[key] = row.value.trim()
  }
  return result
}

const SUGGESTED_KEYS = [
  'Material',
  'Gramaje',
  'Tipo de tela',
  'Fit',
  'Estampado',
  'Tiempo de entrega',
]

export function DetailsEditor({
  rows,
  onChange,
  disabled = false,
  error,
  max = 30,
}: {
  rows: DetailRow[]
  onChange: (rows: DetailRow[]) => void
  disabled?: boolean
  error?: string
  max?: number
}) {
  const update = (index: number, patch: Partial<DetailRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const addRow = (key = '') => {
    if (rows.length >= max) return
    onChange([...rows, { key, value: '' }])
  }

  const usedKeys = new Set(rows.map((r) => r.key.trim().toLowerCase()))
  const pendingKeys = SUGGESTED_KEYS.filter(
    (k) => !usedKeys.has(k.toLowerCase()),
  )

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sin filas. La tienda no mostrara la seccion de detalles en este
          producto.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={index} className="flex gap-2">
              <Input
                value={row.key}
                onChange={(event) => update(index, { key: event.target.value })}
                placeholder="Material"
                aria-label={`Nombre del detalle ${index + 1}`}
                disabled={disabled}
                maxLength={60}
                className="w-2/5 bg-card/60"
              />
              <Input
                value={row.value}
                onChange={(event) =>
                  update(index, { value: event.target.value })
                }
                placeholder="100% Algodon"
                aria-label={`Valor del detalle ${index + 1}`}
                disabled={disabled}
                maxLength={200}
                className="min-w-0 flex-1 bg-card/60"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                disabled={disabled}
                aria-label={`Quitar detalle ${index + 1}`}
                className="shrink-0 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addRow()}
          disabled={disabled || rows.length >= max}
        >
          <Plus className="size-3.5" />
          Anadir detalle
        </Button>
        {pendingKeys.slice(0, 4).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => addRow(key)}
            disabled={disabled || rows.length >= max}
            className="rounded border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:pointer-events-none"
          >
            + {key}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
