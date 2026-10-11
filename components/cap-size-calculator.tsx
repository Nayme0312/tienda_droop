"use client"

import { useId } from "react"
import { ArrowDown, Ruler } from "lucide-react"
import {
  HEAD_CM_MAX,
  HEAD_CM_MIN,
  STANDARD_FITTED_CHART,
  formatCm,
  resolveHeadMeasure,
  type CapSizeChart,
} from "@/lib/caps/size-chart"

/**
 * Calculadora de talla de gorras cerradas: el cliente escribe el contorno de
 * su cabeza en cm y ve la talla que le corresponde segun `chart`.
 *
 * La conversion sale de la tabla (lib/caps/size-chart.ts), no de este
 * componente: para una marca con otra horma basta con pasarle su tabla.
 *
 * Es controlado: la medida vive en el catalogo, que filtra las gorras por la
 * talla calculada y puede vaciar la medida para quitar el filtro.
 */
export function CapSizeCalculator({
  value,
  onValueChange,
  matchCount,
  chart = STANDARD_FITTED_CHART,
}: {
  value: string
  onValueChange: (value: string) => void
  /** Gorras disponibles en la talla calculada (null mientras no hay talla). */
  matchCount: number | null
  chart?: CapSizeChart
}) {
  const inputId = useId()

  const measure = resolveHeadMeasure(value, chart)
  const result = measure.kind === "measured" ? measure.result : null
  const cm = measure.kind === "measured" ? measure.cm : 0
  const matchedLabel = result?.kind === "match" ? result.size.label : null

  return (
    <div className="rounded-xl border border-border bg-card/50 p-5 md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground">
          <Ruler className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
            Calculadora de talla
          </p>
          <p className="text-xs text-muted-foreground">Gorras cerradas</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Medida y resultado */}
        <div>
          <label
            htmlFor={inputId}
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-foreground"
          >
            Contorno de tu cabeza
          </label>
          <div className="relative">
            <input
              id={inputId}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Ej: 57,5"
              value={value}
              onChange={(e) => onValueChange(e.target.value.slice(0, 6))}
              aria-describedby={`${inputId}-result`}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-4 pr-12 text-sm font-semibold text-foreground outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground focus:border-foreground/40"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase text-muted-foreground">
              cm
            </span>
          </div>

          <div
            id={`${inputId}-result`}
            aria-live="polite"
            className="mt-4 min-h-[7.5rem] rounded-lg border border-border bg-background p-4"
          >
            {measure.kind === "empty" ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Escribe tu medida en centimetros y te mostramos la talla de
                gorra cerrada que te corresponde.
              </p>
            ) : measure.kind === "invalid" ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Escribe una medida valida entre {HEAD_CM_MIN} y {HEAD_CM_MAX}{" "}
                cm (por ejemplo 57 o 57,5).
              </p>
            ) : result?.kind === "match" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Tu medida
                    </p>
                    <p className="mt-1 text-2xl font-black tabular-nums text-foreground">
                      {formatCm(cm)} <span className="text-sm">cm</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Tu talla
                    </p>
                    <p className="mt-1 text-2xl font-black tabular-nums text-foreground">
                      {result.size.label}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  La talla {result.size.label} es para cabezas de mas de{" "}
                  {formatCm(result.fromCm)} cm y hasta {formatCm(result.toCm)}{" "}
                  cm.
                </p>
                {matchCount !== null && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                    <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                    {matchCount === 0
                      ? "Por ahora no hay gorras disponibles en tu talla"
                      : `${matchCount} ${matchCount === 1 ? "gorra disponible" : "gorras disponibles"} en tu talla`}
                  </p>
                )}
              </>
            ) : result?.kind === "below" ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {formatCm(cm)} cm es menos que la talla mas pequena de la tabla
                ({result.smallest.label}, hasta{" "}
                {formatCm(result.smallest.maxCm)} cm). Vuelve a medir o
                escribenos y te ayudamos a elegir.
              </p>
            ) : (
              result?.kind === "above" && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {formatCm(cm)} cm supera la talla mas grande de la tabla (
                  {result.largest.label}, hasta {formatCm(result.largest.maxCm)}{" "}
                  cm). Vuelve a medir o escribenos y te ayudamos a elegir.
                </p>
              )
            )}
          </div>
        </div>

        {/* Como medir */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
            Como medir tu cabeza
          </p>
          <ol className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
            {[
              "Usa una cinta metrica flexible (o un cordon y luego una regla).",
              "Rodea la cabeza por la parte mas ancha: 1 cm por encima de las cejas y por encima de las orejas.",
              "Ajusta la cinta sin apretar y anota la medida en centimetros.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-bold text-foreground">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Si quedas entre dos tallas, elige la mayor: una gorra cerrada no se
            ajusta. Las gorras con cierre ajustable no necesitan talla.
          </p>
        </div>
      </div>

      {/* Tabla de equivalencias */}
      <div className="mt-6 border-t border-border pt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
          Tabla de tallas
        </p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {chart.sizes.map((size) => {
            const active = size.label === matchedLabel
            return (
              <li
                key={size.label}
                className={`rounded-lg border px-2 py-2 text-center transition-colors duration-300 ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground"
                }`}
              >
                <p className="text-sm font-black tabular-nums">{size.label}</p>
                <p
                  className={`text-[10px] tabular-nums ${
                    active ? "text-background/70" : "text-muted-foreground"
                  }`}
                >
                  hasta {formatCm(size.maxCm)} cm
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
