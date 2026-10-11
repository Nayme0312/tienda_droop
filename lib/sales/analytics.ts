import { PaymentStatus, type PaymentMethod } from '@prisma/client'
import { prisma } from '@/lib/db'
import { badRequest } from '@/lib/api/http'
import type {
  AnalyticsPreset,
  AnalyticsReport,
  CategorySales,
  MonthComparisonMetric,
  MonthlyRevenue,
  ProductSales,
} from '@/lib/admin/types'
import {
  addDays,
  addMonths,
  dayKey,
  daysBetween,
  firstDayOfMonth,
  isValidDayKey,
  lastDayOfMonth,
  monthKey,
  startOfDay,
} from './bogota-time'

const PRESETS = new Set<AnalyticsPreset>([
  'today',
  '7d',
  '30d',
  'month',
  'prev-month',
  'custom',
])
const MAX_CUSTOM_DAYS = 366
const MONTHS_IN_CHART = 6
const TOP_PRODUCTS = 5
// Lista literal a proposito: no se lee el enum de Prisma al cargar el modulo,
// para que un cliente de Prisma sin regenerar no tumbe el endpoint entero.
const METHODS: PaymentMethod[] = ['WOMPI', 'CASH', 'TRANSFER', 'OTHER']
const NO_CATEGORY = { slug: '', name: 'Sin categoria' }

/** Traduce el filtro del panel a un rango de dias (ambos inclusive). */
export function resolveRange(
  preset: string | null,
  from: string | null,
  to: string | null,
  now = new Date(),
): { from: string; to: string } {
  const today = dayKey(now)
  const thisMonth = monthKey(now)
  const selected = PRESETS.has(preset as AnalyticsPreset)
    ? (preset as AnalyticsPreset)
    : 'month'

  switch (selected) {
    case 'today':
      return { from: today, to: today }
    case '7d':
      return { from: addDays(today, -6), to: today }
    case '30d':
      return { from: addDays(today, -29), to: today }
    case 'month':
      return { from: firstDayOfMonth(thisMonth), to: today }
    case 'prev-month': {
      const previous = addMonths(thisMonth, -1)
      return { from: firstDayOfMonth(previous), to: lastDayOfMonth(previous) }
    }
    case 'custom': {
      if (!isValidDayKey(from) || !isValidDayKey(to)) {
        throw badRequest('Indica una fecha de inicio y una de fin validas.')
      }
      if (from > to) {
        throw badRequest('La fecha de inicio no puede ser posterior a la de fin.')
      }
      if (addDays(from, MAX_CUSTOM_DAYS - 1) < to) {
        throw badRequest('El periodo no puede superar un ano.')
      }
      return { from, to }
    }
  }
}

function compare(current: number, previous: number): MonthComparisonMetric {
  return {
    current,
    previous,
    diff: current - previous,
    percent:
      previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null,
  }
}

/**
 * Informe de ventas del panel, calculado sobre PostgreSQL.
 *
 * UNA sola definicion de "venta": un pedido con `paymentStatus = APPROVED`,
 * fechado por `paidAt`. Eso cubre los pedidos en linea que Wompi confirmo y las
 * ventas presenciales, y deja fuera pendientes, rechazados y anulados. Como
 * ambos tipos son filas de la misma tabla, una venta no puede contarse dos
 * veces.
 *
 * Los ingresos por producto y categoria salen de las lineas del pedido
 * (`unitPrice * quantity`, el precio realmente cobrado), no del precio actual
 * del catalogo.
 */
export async function buildAnalyticsReport(
  range: { from: string; to: string },
  now = new Date(),
): Promise<AnalyticsReport> {
  const currentMonth = monthKey(now)
  const previousMonth = addMonths(currentMonth, -1)
  const firstChartMonth = addMonths(currentMonth, -(MONTHS_IN_CHART - 1))

  const rangeStart = startOfDay(range.from)
  const rangeEnd = startOfDay(addDays(range.to, 1))
  const chartStart = startOfDay(firstDayOfMonth(firstChartMonth))
  const chartEnd = startOfDay(firstDayOfMonth(addMonths(currentMonth, 1)))

  // Se leen de una vez las ventas que necesita cualquiera de las vistas: el
  // periodo elegido y los ultimos 6 meses.
  const [sales, categories, unpaid] = await Promise.all([
    prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.APPROVED,
        paidAt: {
          gte: rangeStart < chartStart ? rangeStart : chartStart,
          lt: rangeEnd > chartEnd ? rangeEnd : chartEnd,
        },
      },
      select: {
        total: true,
        paidAt: true,
        paymentMethod: true,
        items: {
          select: {
            productId: true,
            productName: true,
            unitPrice: true,
            quantity: true,
            product: {
              select: {
                name: true,
                category: { select: { slug: true, name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.category.findMany({
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.order.groupBy({
      by: ['paymentStatus'],
      where: {
        paymentStatus: { not: PaymentStatus.APPROVED },
        createdAt: { gte: rangeStart, lt: rangeEnd },
      },
      _count: { _all: true },
    }),
  ])

  // --- Acumuladores -------------------------------------------------------
  const daily = new Map(
    daysBetween(range.from, range.to).map((date) => [
      date,
      { date, revenue: 0, sales: 0 },
    ]),
  )
  const monthly = new Map<string, MonthlyRevenue>()
  for (let i = 0; i < MONTHS_IN_CHART; i++) {
    const month = addMonths(firstChartMonth, i)
    monthly.set(month, { month, total: 0, WOMPI: 0, CASH: 0, TRANSFER: 0, OTHER: 0 })
  }
  const monthSales = new Map<string, number>()
  const byMethod = new Map(
    METHODS.map((method) => [method, { method, sales: 0, revenue: 0 }]),
  )
  const byProduct = new Map<string, ProductSales>()
  const byCategory = new Map<string, CategorySales>(
    categories.map((c) => [c.slug, { ...c, units: 0, revenue: 0 }]),
  )
  const summary = { revenue: 0, sales: 0, units: 0, avgTicket: 0 }

  // --- Una pasada por las ventas -----------------------------------------
  for (const sale of sales) {
    if (!sale.paidAt) continue
    const day = dayKey(sale.paidAt)
    const month = day.slice(0, 7)

    const monthRow = monthly.get(month)
    if (monthRow) {
      monthRow.total += sale.total
      monthRow[sale.paymentMethod] += sale.total
      monthSales.set(month, (monthSales.get(month) ?? 0) + 1)
    }

    const dayRow = daily.get(day)
    if (!dayRow) continue // fuera del periodo elegido

    dayRow.revenue += sale.total
    dayRow.sales += 1
    summary.revenue += sale.total
    summary.sales += 1

    const method = byMethod.get(sale.paymentMethod)
    if (method) {
      method.sales += 1
      method.revenue += sale.total
    }

    for (const item of sale.items) {
      const lineTotal = item.unitPrice * item.quantity
      summary.units += item.quantity

      // Producto borrado despues de la venta: se agrupa por el nombre que
      // quedo copiado en la linea del pedido.
      const key = item.productId ?? `nombre:${item.productName}`
      const product = byProduct.get(key) ?? {
        key,
        name: item.product?.name ?? item.productName,
        units: 0,
        revenue: 0,
      }
      product.units += item.quantity
      product.revenue += lineTotal
      byProduct.set(key, product)

      const category = item.product?.category ?? NO_CATEGORY
      const categoryRow = byCategory.get(category.slug) ?? {
        ...category,
        units: 0,
        revenue: 0,
      }
      categoryRow.units += item.quantity
      categoryRow.revenue += lineTotal
      byCategory.set(category.slug, categoryRow)
    }
  }

  summary.avgTicket =
    summary.sales > 0 ? Math.round(summary.revenue / summary.sales) : 0

  const products = [...byProduct.values()]
  const unpaidCount = (statuses: PaymentStatus[]) =>
    unpaid
      .filter((row) => statuses.includes(row.paymentStatus))
      .reduce((sum, row) => sum + row._count._all, 0)

  return {
    range,
    summary,
    daily: [...daily.values()],
    monthly: [...monthly.values()],
    topByUnits: [...products]
      .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
      .slice(0, TOP_PRODUCTS),
    topByRevenue: [...products]
      .sort((a, b) => b.revenue - a.revenue || b.units - a.units)
      .slice(0, TOP_PRODUCTS),
    byCategory: [...byCategory.values()].sort((a, b) => b.revenue - a.revenue),
    byMethod: [...byMethod.values()],
    comparison: {
      currentMonth,
      previousMonth,
      revenue: compare(
        monthly.get(currentMonth)?.total ?? 0,
        monthly.get(previousMonth)?.total ?? 0,
      ),
      sales: compare(
        monthSales.get(currentMonth) ?? 0,
        monthSales.get(previousMonth) ?? 0,
      ),
    },
    orderStatus: {
      paid: summary.sales,
      pending: unpaidCount([PaymentStatus.PENDING]),
      rejected: unpaidCount([
        PaymentStatus.DECLINED,
        PaymentStatus.VOIDED,
        PaymentStatus.ERROR,
      ]),
    },
  }
}
