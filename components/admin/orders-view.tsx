'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  LoaderCircle,
  Receipt,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'
import { ApiError } from '@/lib/api/client'
import * as ordersService from '@/lib/admin/orders-service'
import {
  PAYMENT_METHOD_LABELS,
  type AdminOrder,
  type OrderFulfillment,
  type OrderPaymentStatus,
} from '@/lib/admin/types'
import { AdminPageHeader } from './admin-page-header'
import { RegisterSaleButton } from './register-sale-dialog'

const PAYMENT_LABELS: Record<OrderPaymentStatus, { label: string; tone: string }> = {
  APPROVED: { label: 'Pagado', tone: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' },
  PENDING: { label: 'Pendiente', tone: 'border-amber-500/20 bg-amber-500/10 text-amber-300' },
  DECLINED: { label: 'Rechazado', tone: 'border-red-500/20 bg-red-500/10 text-red-400' },
  VOIDED: { label: 'Anulado', tone: 'border-red-500/20 bg-red-500/10 text-red-400' },
  ERROR: { label: 'Error', tone: 'border-red-500/20 bg-red-500/10 text-red-400' },
}

const FULFILLMENT_LABELS: Record<OrderFulfillment, string> = {
  NEW: 'Nuevo',
  PREPARING: 'En preparacion',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

const FILTERS: { label: string; value: OrderPaymentStatus | 'ALL' }[] = [
  { label: 'Pagados', value: 'APPROVED' },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'Rechazados', value: 'DECLINED' },
  { label: 'Todos', value: 'ALL' },
]

const dateTime = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

/**
 * Pedidos en linea y ventas presenciales. El estado del pago es de solo
 * lectura (en los pedidos en linea lo fija Wompi); desde aqui se gestiona la
 * preparacion y el envio de los pedidos en linea.
 */
export function OrdersView() {
  const [filter, setFilter] = useState<OrderPaymentStatus | 'ALL'>('APPROVED')
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      setError(null)
      setOrders(await ordersService.getOrders(filter === 'ALL' ? undefined : filter))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los pedidos')
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  const handleFulfillment = async (order: AdminOrder, value: OrderFulfillment) => {
    setPendingId(order.id)
    try {
      const updated = await ordersService.setFulfillment(order.id, value)
      setOrders((current) => current.map((o) => (o.id === updated.id ? updated : o)))
      toast.success(`Pedido ${updated.reference}: ${FULFILLMENT_LABELS[value]}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo actualizar el pedido')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Pedidos"
        description="Pedidos en linea (el pago lo confirma Wompi; aqui gestionas la preparacion y el envio) y ventas presenciales registradas a mano."
        actions={
          <>
          <RegisterSaleButton onRegistered={() => void load()} />
          <Button
            variant="outline"
            onClick={() => void load()}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
            Actualizar
          </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              filter === item.value
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {isLoading && orders.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card/40" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card/40 p-10 text-center">
          <Receipt className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">No hay pedidos en este filtro.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const open = openId === order.id
            const payment = PAYMENT_LABELS[order.paymentStatus]
            const units = order.items.reduce((sum, item) => sum + item.quantity, 0)
            const inPerson = order.channel === 'IN_PERSON'
            const customer = order.customerName || 'Cliente sin registrar'

            return (
              <li key={order.id} className="rounded-xl border border-border bg-card/60">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : order.id)}
                  aria-expanded={open}
                  className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-semibold text-foreground">{order.reference}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {customer} · {units} {units === 1 ? 'unidad' : 'unidades'} ·{' '}
                      {dateTime.format(new Date(inPerson && order.paidAt ? order.paidAt : order.createdAt))}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {inPerson && (
                      <span className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Presencial · {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                      </span>
                    )}
                    <span className={cn('rounded-md border px-2 py-0.5 text-xs font-medium', payment.tone)}>
                      {payment.label}
                    </span>
                    {order.paymentStatus === 'APPROVED' && !inPerson && (
                      <span className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {FULFILLMENT_LABELS[order.fulfillment]}
                      </span>
                    )}
                    <span className="font-semibold text-foreground">{formatPrice(order.total)}</span>
                    <ChevronDown
                      className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')}
                    />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-6 border-t border-border p-4 sm:p-5 md:grid-cols-2">
                        <div>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                            Productos
                          </p>
                          <ul className="space-y-2 text-sm">
                            {order.items.map((item) => (
                              <li key={item.id} className="flex justify-between gap-4">
                                <span className="text-foreground">
                                  {item.productName}
                                  <span className="text-muted-foreground">
                                    {[item.size && ` · Talla ${item.size}`, item.color && ` · ${item.color}`]
                                      .filter(Boolean)
                                      .join('')}{' '}
                                    x{item.quantity}
                                  </span>
                                </span>
                                <span className="shrink-0 text-muted-foreground">
                                  {formatPrice(item.unitPrice * item.quantity)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold text-foreground">
                            <span>Total</span>
                            <span>{formatPrice(order.total)}</span>
                          </p>
                        </div>

                        <div className="space-y-4 text-sm">
                          <div>
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                              {inPerson ? 'Cliente' : 'Cliente y entrega'}
                            </p>
                            <p className="text-foreground">{customer}</p>
                            {!inPerson && (
                              <>
                                <p className="text-muted-foreground">{order.customerEmail}</p>
                                <p className="text-muted-foreground">{order.customerPhone}</p>
                                <p className="mt-1 text-muted-foreground">
                                  {order.address}, {order.city}, {order.region}
                                </p>
                              </>
                            )}
                            {order.notes && (
                              <p className="mt-1 text-muted-foreground">Notas: {order.notes}</p>
                            )}
                          </div>

                          <div>
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                              Pago
                            </p>
                            <p className="text-muted-foreground">
                              {inPerson
                                ? `Venta presencial · ${PAYMENT_METHOD_LABELS[order.paymentMethod]}`
                                : (order.paymentMethodType ?? 'Sin transaccion aun')}
                              {order.wompiTransactionId && ` · ${order.wompiTransactionId}`}
                            </p>
                            {order.paidAt && (
                              <p className="text-muted-foreground">
                                Pagado: {dateTime.format(new Date(order.paidAt))}
                              </p>
                            )}
                            {order.statusMessage && (
                              <p className="text-muted-foreground">{order.statusMessage}</p>
                            )}
                          </div>

                          {order.paymentStatus === 'APPROVED' && !inPerson && (
                            <label className="block">
                              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                                Estado del pedido
                              </span>
                              <div className="flex items-center gap-2">
                                <select
                                  value={order.fulfillment}
                                  disabled={pendingId === order.id}
                                  onChange={(e) =>
                                    handleFulfillment(order, e.target.value as OrderFulfillment)
                                  }
                                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/40"
                                >
                                  {Object.entries(FULFILLMENT_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                                {pendingId === order.id && (
                                  <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" />
                                )}
                              </div>
                            </label>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
