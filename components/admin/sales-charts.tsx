'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { formatPrice } from '@/lib/admin/format'
import {
  PAYMENT_METHOD_LABELS,
  type AnalyticsReport,
  type PaymentMethod,
} from '@/lib/admin/types'

/**
 * Color de cada metodo de pago. Es fijo por metodo (no por posicion) y el mismo
 * en todas las graficas y listas del Dashboard. Paleta comprobada para el fondo
 * oscuro del panel: contraste >= 3:1 y distinguible con daltonismo.
 */
export const METHOD_COLORS: Record<PaymentMethod, string> = {
  WOMPI: '#3987e5',
  CASH: '#d95926',
  TRANSFER: '#199e70',
  OTHER: '#c98500',
}

export const METHOD_ORDER: PaymentMethod[] = ['WOMPI', 'CASH', 'TRANSFER', 'OTHER']

const compact = new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const monthFormat = new Intl.DateTimeFormat('es-CO', {
  month: 'short',
  timeZone: 'UTC',
})
const monthLongFormat = new Intl.DateTimeFormat('es-CO', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const dayFormat = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/** "2026-09" -> "sep" */
export const formatMonthShort = (month: string) =>
  monthFormat.format(new Date(`${month}-01T00:00:00Z`)).replace('.', '')
/** "2026-09" -> "septiembre de 2026" */
export const formatMonthLong = (month: string) =>
  monthLongFormat.format(new Date(`${month}-01T00:00:00Z`))
/** "2026-09-30" -> "30 sep" */
export const formatDay = (day: string) =>
  dayFormat.format(new Date(`${day}T00:00:00Z`)).replace('.', '')

const axisMoney = (value: number) => `$${compact.format(value)}`

const tooltipBox =
  'min-w-[10rem] rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl'

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex h-64 items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}

export function MethodLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {METHOD_ORDER.map((method) => (
        <li key={method} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-[3px]"
            style={{ backgroundColor: METHOD_COLORS[method] }}
          />
          {PAYMENT_METHOD_LABELS[method]}
        </li>
      ))}
    </ul>
  )
}

function MonthlyTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((item) => Number(item.value) > 0)
  const total = payload.reduce((sum, item) => sum + Number(item.value ?? 0), 0)

  return (
    <div className={tooltipBox}>
      <p className="mb-1.5 font-medium capitalize text-foreground">
        {formatMonthLong(String(label))}
      </p>
      {rows.map((item) => (
        <p key={item.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              aria-hidden
              className="size-2 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
            {PAYMENT_METHOD_LABELS[item.dataKey as PaymentMethod]}
          </span>
          <span className="tabular-nums text-foreground">
            {formatPrice(Number(item.value))}
          </span>
        </p>
      ))}
      <p className="mt-1.5 flex justify-between gap-4 border-t border-border pt-1.5 font-medium text-foreground">
        <span>Total</span>
        <span className="tabular-nums">{formatPrice(total)}</span>
      </p>
    </div>
  )
}

/** Ingresos de los ultimos meses, apilados por metodo de pago. */
export function MonthlyRevenueChart({ data }: { data: AnalyticsReport['monthly'] }) {
  if (data.every((row) => row.total === 0)) {
    return <EmptyChart>Todavia no hay ventas pagadas en los ultimos meses.</EmptyChart>
  }

  return (
    <ChartContainer config={{}} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonthShort}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickFormatter={axisMoney}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <ChartTooltip cursor={{ opacity: 0.4 }} content={<MonthlyTooltip />} />
        {METHOD_ORDER.map((method) => (
          <Bar
            key={method}
            dataKey={method}
            stackId="revenue"
            fill={METHOD_COLORS[method]}
            // Separacion de 1px del color del fondo entre segmentos apilados.
            stroke="var(--background)"
            strokeWidth={1}
            maxBarSize={44}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

function DailyTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as AnalyticsReport['daily'][number]

  return (
    <div className={tooltipBox}>
      <p className="mb-1.5 font-medium text-foreground">{formatDay(String(label))}</p>
      <p className="flex justify-between gap-4 py-0.5">
        <span className="text-muted-foreground">Ingresos</span>
        <span className="tabular-nums text-foreground">{formatPrice(point.revenue)}</span>
      </p>
      <p className="flex justify-between gap-4 py-0.5">
        <span className="text-muted-foreground">Ventas</span>
        <span className="tabular-nums text-foreground">{point.sales}</span>
      </p>
    </div>
  )
}

/** Evolucion diaria de los ingresos dentro del periodo elegido. */
export function DailySalesChart({ data }: { data: AnalyticsReport['daily'] }) {
  if (data.length < 2) {
    return (
      <EmptyChart>
        Elige un periodo de varios dias para ver la evolucion de las ventas.
      </EmptyChart>
    )
  }
  if (data.every((point) => point.sales === 0)) {
    return <EmptyChart>No hay ventas pagadas en este periodo.</EmptyChart>
  }

  return (
    <ChartContainer config={{}} className="aspect-auto h-64 w-full">
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
        />
        <YAxis
          tickFormatter={axisMoney}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <ChartTooltip content={<DailyTooltip />} />
        <Line
          dataKey="revenue"
          type="linear"
          stroke="var(--foreground)"
          strokeWidth={2}
          dot={data.length <= 31 ? { r: 2.5, fill: 'var(--foreground)' } : false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
