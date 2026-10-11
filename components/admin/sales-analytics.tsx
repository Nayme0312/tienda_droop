'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Minus,
  Receipt,
  ShoppingBag,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { formatPrice } from '@/lib/admin/format'
import { adminRoutes } from '@/lib/admin/routes'
import * as salesService from '@/lib/admin/sales-service'
import {
  PAYMENT_METHOD_LABELS,
  type AdminProduct,
  type AnalyticsPreset,
  type AnalyticsQuery,
  type AnalyticsReport,
  type MonthComparisonMetric,
  type ProductSales,
} from '@/lib/admin/types'
import {
  DailySalesChart,
  METHOD_COLORS,
  METHOD_ORDER,
  MethodLegend,
  MonthlyRevenueChart,
  formatDay,
  formatMonthLong,
} from './sales-charts'
import { StatsCard } from './stats-card'
import { LOW_STOCK_THRESHOLD, StockBadge } from './status-badge'

const PRESETS: { label: string; value: AnalyticsPreset }[] = [
  { label: 'Hoy', value: 'today' },
  { label: 'Ultimos 7 dias', value: '7d' },
  { label: 'Ultimos 30 dias', value: '30d' },
  { label: 'Este mes', value: 'month' },
  { label: 'Mes anterior', value: 'prev-month' },
  { label: 'Personalizado', value: 'custom' },
]

const LOW_STOCK_ROWS = 6

const dateInputClass =
  'rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-foreground/40'

function Panel({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-card/40', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
  )
}

/** Fila con barra proporcional: nombre, dato secundario y valor principal. */
function BarRow({
  label,
  detail,
  value,
  ratio,
  color = 'var(--foreground)',
}: {
  label: string
  detail: string
  value: string
  ratio: number
  color?: string
}) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-foreground">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-foreground">
          {value}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(ratio * 100, ratio > 0 ? 2 : 0)}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {detail}
        </span>
      </div>
    </li>
  )
}

const units = (count: number) => `${count} ${count === 1 ? 'unidad' : 'unidades'}`
const salesCount = (count: number) => `${count} ${count === 1 ? 'venta' : 'ventas'}`

function ProductRanking({
  rows,
  metric,
}: {
  rows: ProductSales[]
  metric: 'units' | 'revenue'
}) {
  if (rows.length === 0) return <Empty>No hay ventas en este periodo.</Empty>
  const max = rows[0][metric]

  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <BarRow
          key={row.key}
          label={row.name}
          value={metric === 'units' ? units(row.units) : formatPrice(row.revenue)}
          detail={metric === 'units' ? formatPrice(row.revenue) : units(row.units)}
          ratio={max > 0 ? row[metric] / max : 0}
        />
      ))}
    </ul>
  )
}

function ComparisonRow({
  label,
  metric,
  format,
}: {
  label: string
  metric: MonthComparisonMetric
  format: (value: number) => string
}) {
  const Icon = metric.diff > 0 ? ArrowUpRight : metric.diff < 0 ? ArrowDownRight : Minus
  const tone =
    metric.diff > 0
      ? 'text-emerald-400'
      : metric.diff < 0
        ? 'text-red-400'
        : 'text-muted-foreground'
  const sign = metric.diff > 0 ? '+' : metric.diff < 0 ? '-' : ''

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">
        {format(metric.current)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Mes anterior: <span className="tabular-nums">{format(metric.previous)}</span>
      </p>
      <p className={cn('mt-2 flex items-center gap-1 text-xs font-medium', tone)}>
        <Icon className="size-3.5" />
        <span className="tabular-nums">
          {sign}
          {format(Math.abs(metric.diff))}
          {metric.percent !== null && ` (${sign}${Math.abs(metric.percent)}%)`}
        </span>
      </p>
      {metric.percent === null && (
        <p className="mt-1 text-xs text-muted-foreground">
          Sin ventas el mes anterior: no hay base para un porcentaje.
        </p>
      )}
    </div>
  )
}

/**
 * Seccion "Ventas y analiticas" del Dashboard. Solo lee: todo sale de
 * /api/admin/analytics (pedidos pagados en PostgreSQL). `refreshKey` cambia
 * cuando se registra una venta, para volver a pedir el informe.
 */
export function SalesAnalytics({
  products,
  refreshKey = 0,
}: {
  /** Productos ya cargados por el panel: de ahi sale el stock bajo. */
  products: AdminProduct[]
  refreshKey?: number
}) {
  const router = useRouter()
  const [preset, setPreset] = useState<AnalyticsPreset>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [report, setReport] = useState<AnalyticsReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Con "Personalizado" no se consulta hasta tener un rango completo y valido.
  const query = useMemo<AnalyticsQuery | null>(() => {
    if (preset !== 'custom') return { preset }
    if (!customFrom || !customTo || customFrom > customTo) return null
    return { preset, from: customFrom, to: customTo }
  }, [preset, customFrom, customTo])

  useEffect(() => {
    if (!query) return
    let active = true
    setIsLoading(true)
    salesService
      .getAnalytics(query)
      .then((data) => {
        if (!active) return
        setReport(data)
        setError(null)
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof ApiError && err.isUnauthorized) {
          router.replace(adminRoutes.login)
          router.refresh()
          return
        }
        setError(
          err instanceof Error ? err.message : 'No se pudieron cargar las analiticas',
        )
      })
      .finally(() => active && setIsLoading(false))
    return () => {
      active = false
    }
  }, [query, refreshKey, router])

  const lowStock = useMemo(
    () =>
      products
        .filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, 'es')),
    [products],
  )

  const loading = isLoading && !report
  const periodLabel = report
    ? report.range.from === report.range.to
      ? formatDay(report.range.from)
      : `${formatDay(report.range.from)} – ${formatDay(report.range.to)}`
    : ''
  const ofMonth = preset === 'month' ? ' del mes' : ''
  const maxCategory = Math.max(0, ...(report?.byCategory.map((c) => c.revenue) ?? []))
  const maxMethod = Math.max(0, ...(report?.byMethod.map((m) => m.revenue) ?? []))

  return (
    <section className="mt-10" aria-labelledby="analytics-title">
      <div className="mb-4 flex flex-col gap-3">
        <div>
          <h2
            id="analytics-title"
            className="text-xl font-bold tracking-tight text-foreground"
          >
            Ventas y analiticas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedidos en linea confirmados por Wompi y ventas presenciales pagadas.
            {periodLabel && ` Periodo: ${periodLabel}.`}
          </p>
        </div>

        {/* Un solo filtro para toda la seccion */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPreset(item.value)}
              aria-pressed={preset === item.value}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                preset === item.value
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
          {preset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                aria-label="Desde"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className={dateInputClass}
              />
              <span className="text-xs text-muted-foreground">a</span>
              <input
                type="date"
                aria-label="Hasta"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className={dateInputClass}
              />
            </div>
          )}
        </div>
      </div>

      {preset === 'custom' && !query && (
        <p className="mb-4 text-sm text-muted-foreground">
          Elige la fecha de inicio y la de fin para ver el periodo.
        </p>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* A) Tarjetas principales */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatsCard
          index={0}
          label={`Ingresos${ofMonth}`}
          value={formatPrice(report?.summary.revenue ?? 0)}
          hint="Ventas pagadas"
          icon={Banknote}
          tone="positive"
          isLoading={loading}
        />
        <StatsCard
          index={1}
          label={`Ventas${ofMonth}`}
          value={report?.summary.sales ?? 0}
          hint="Pedidos en linea y presenciales"
          icon={Receipt}
          isLoading={loading}
        />
        <StatsCard
          index={2}
          label="Productos vendidos"
          value={report?.summary.units ?? 0}
          hint="Unidades"
          icon={ShoppingBag}
          isLoading={loading}
        />
        <StatsCard
          index={3}
          label="Ticket promedio"
          value={formatPrice(report?.summary.avgTicket ?? 0)}
          hint="Ingresos / ventas"
          icon={Wallet}
          isLoading={loading}
        />
      </div>

      {loading ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-xl border border-border bg-card/40"
            />
          ))}
        </div>
      ) : (
        report && (
          <div
            className={cn(
              'mt-4 grid gap-4 transition-opacity lg:grid-cols-2',
              isLoading && 'opacity-60',
            )}
          >
            {/* B) Ingresos por mes */}
            <Panel
              title="Ingresos por mes"
              description="Ultimos 6 meses, por metodo de pago"
            >
              <MonthlyRevenueChart data={report.monthly} />
              <div className="mt-3">
                <MethodLegend />
              </div>
            </Panel>

            {/* C) Evolucion de ventas */}
            <Panel title="Evolucion de ventas" description="Ingresos por dia del periodo">
              <DailySalesChart data={report.daily} />
            </Panel>

            {/* H) Comparacion mensual */}
            <Panel
              title="Comparacion mensual"
              description={`${formatMonthLong(report.comparison.currentMonth)} (en curso) frente a ${formatMonthLong(report.comparison.previousMonth)}`}
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <ComparisonRow
                  label="Ingresos"
                  metric={report.comparison.revenue}
                  format={formatPrice}
                />
                <ComparisonRow
                  label="Cantidad de ventas"
                  metric={report.comparison.sales}
                  format={String}
                />
              </div>
            </Panel>

            {/* G) Metodos de pago */}
            <Panel title="Metodos de pago" description="Ingresos por metodo en el periodo">
              <ul className="space-y-4">
                {METHOD_ORDER.map((method) => {
                  const row = report.byMethod.find((m) => m.method === method)
                  const revenue = row?.revenue ?? 0
                  return (
                    <BarRow
                      key={method}
                      label={PAYMENT_METHOD_LABELS[method]}
                      value={formatPrice(revenue)}
                      detail={salesCount(row?.sales ?? 0)}
                      ratio={maxMethod > 0 ? revenue / maxMethod : 0}
                      color={METHOD_COLORS[method]}
                    />
                  )
                })}
              </ul>
            </Panel>

            {/* D) Productos mas vendidos */}
            <Panel title="Productos mas vendidos" description="Por unidades vendidas">
              <ProductRanking rows={report.topByUnits} metric="units" />
            </Panel>

            {/* E) Productos que mas dinero generan */}
            <Panel
              title="Productos que mas dinero generan"
              description="Por ingresos generados"
            >
              <ProductRanking rows={report.topByRevenue} metric="revenue" />
            </Panel>

            {/* F) Ventas por categoria */}
            <Panel title="Ventas por categoria" description="Ingresos y unidades">
              {report.byCategory.length === 0 ? (
                <Empty>No hay categorias.</Empty>
              ) : (
                <ul className="space-y-4">
                  {report.byCategory.map((category) => (
                    <BarRow
                      key={category.slug}
                      label={category.name}
                      value={formatPrice(category.revenue)}
                      detail={units(category.units)}
                      ratio={maxCategory > 0 ? category.revenue / maxCategory : 0}
                    />
                  ))}
                </ul>
              )}
            </Panel>

            {/* I) Estado de pedidos */}
            <Panel
              title="Estado de pedidos"
              description="Resumen del periodo"
              action={
                <Link
                  href={adminRoutes.orders}
                  className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Ir a pedidos
                </Link>
              }
            >
              <dl className="grid grid-cols-3 gap-3 text-center">
                {(
                  [
                    ['Pagados', report.orderStatus.paid, 'bg-emerald-400'],
                    ['Pendientes', report.orderStatus.pending, 'bg-amber-400'],
                    ['Rechazados / cancelados', report.orderStatus.rejected, 'bg-red-400'],
                  ] as const
                ).map(([label, value, dot]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border bg-background/50 px-2 py-4"
                  >
                    <dd className="text-2xl font-bold tabular-nums text-foreground">
                      {value}
                    </dd>
                    <dt className="mt-1 text-xs text-muted-foreground">
                      <span
                        aria-hidden
                        className={cn('mr-1.5 inline-block size-1.5 rounded-full align-middle', dot)}
                      />
                      {label}
                    </dt>
                  </div>
                ))}
              </dl>
            </Panel>
          </div>
        )
      )}

      {/* J) Stock bajo: inventario actual, no depende del periodo */}
      <Panel
        className="mt-4"
        title="Stock bajo"
        description={`Productos con ${LOW_STOCK_THRESHOLD} unidades o menos que conviene reponer`}
      >
        {lowStock.length === 0 ? (
          <Empty>Ningun producto tiene stock bajo.</Empty>
        ) : (
          <>
            <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {lowStock.slice(0, LOW_STOCK_ROWS).map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3">
                  <Link
                    href={adminRoutes.editProduct(product.id)}
                    className="min-w-0 truncate text-sm text-foreground hover:underline"
                  >
                    {product.name}
                  </Link>
                  <StockBadge stock={product.stock} />
                </li>
              ))}
            </ul>
            {lowStock.length > LOW_STOCK_ROWS && (
              <p className="mt-4 text-xs text-muted-foreground">
                Y {lowStock.length - LOW_STOCK_ROWS} mas con stock bajo.
              </p>
            )}
          </>
        )}
      </Panel>
    </section>
  )
}
