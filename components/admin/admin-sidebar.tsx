'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  LayoutList,
  LoaderCircle,
  LogOut,
  Megaphone,
  MessageSquareQuote,
  MonitorPlay,
  Package,
  PartyPopper,
  Receipt,
  Settings,
  Store,
  TicketPercent,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { adminRoutes } from '@/lib/admin/routes'
import { API_ROUTES, api } from '@/lib/api/client'
import { useCategories } from './categories-provider'
import { getCategoryIcon } from './category-icons'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** true = solo se marca activo con coincidencia exacta de la ruta. */
  exact?: boolean
}

const MAIN_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: adminRoutes.dashboard,
    icon: LayoutDashboard,
    exact: true,
  },
  { label: 'Pedidos', href: adminRoutes.orders, icon: Receipt },
  { label: 'Productos', href: adminRoutes.products, icon: Package },
  { label: 'Promociones', href: adminRoutes.promotions, icon: TicketPercent },
]

// Las categorias del menu salen de PostgreSQL (useCategories): crear una
// seccion en Secciones de tienda la hace aparecer aqui sola.
const toCategoryItem = (category: { name: string; slug: string }): NavItem => ({
  label: category.name,
  href: adminRoutes.category(category.slug),
  icon: getCategoryIcon(category.slug),
})

const SETTINGS_ITEMS: NavItem[] = [
  {
    label: 'Secciones de tienda',
    href: adminRoutes.sections,
    icon: LayoutList,
  },
  {
    label: 'Fechas especiales',
    href: adminRoutes.specialDates,
    icon: PartyPopper,
  },
  { label: 'Hero de portada', href: adminRoutes.hero, icon: MonitorPlay },
  { label: 'Cinta marquesina', href: adminRoutes.marquee, icon: Megaphone },
  {
    label: 'Testimonios',
    href: adminRoutes.testimonials,
    icon: MessageSquareQuote,
  },
  { label: 'Configuracion', href: adminRoutes.settings, icon: Settings },
]

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  onNavigate?: () => void
}) {
  const active = isNavItemActive(pathname, item)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
      )}
    >
      {/* Marca vertical del elemento activo */}
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-foreground transition-all duration-200',
          active ? 'opacity-100' : 'opacity-0',
        )}
      />
      <Icon
        className={cn(
          'size-4 shrink-0 transition-colors',
          active
            ? 'text-foreground'
            : 'text-muted-foreground group-hover:text-foreground',
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
      {children}
    </p>
  )
}

/**
 * Contenido del sidebar. Se renderiza dos veces: fijo en escritorio y dentro
 * del Sheet en movil, por eso recibe `onNavigate` para cerrar el panel movil
 * al pulsar un enlace.
 */
export function AdminSidebar({
  onNavigate,
  adminName,
  adminEmail,
}: {
  onNavigate?: () => void
  adminName?: string
  adminEmail?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { categories } = useCategories()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // El servidor borra la cookie de sesion; el cliente no guarda nada.
      await api.post(API_ROUTES.logout)
      onNavigate?.()
      router.replace(adminRoutes.login)
      router.refresh()
    } catch {
      setIsLoggingOut(false)
      toast.error('No se pudo cerrar la sesion. Intentalo de nuevo.')
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Marca */}
      <div className="shrink-0 border-b border-border px-5 py-5">
        <Link
          href={adminRoutes.dashboard}
          onClick={onNavigate}
          className="block"
        >
          <p className="text-lg font-black uppercase leading-none tracking-[0.2em] text-foreground">
            Streetvibe
          </p>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Panel administrativo
          </p>
        </Link>
      </div>

      {/* Navegacion */}
      <nav
        aria-label="Navegacion del panel"
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
      >
        <div className="space-y-1">
          {MAIN_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <SectionLabel>Categorias</SectionLabel>
        <div className="space-y-1">
          {categories.map(toCategoryItem).map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <SectionLabel>Sistema</SectionLabel>
        <div className="space-y-1">
          {SETTINGS_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      {/* Pie */}
      <div className="shrink-0 border-t border-border px-3 py-3">
        {/* Administrador de la sesion actual */}
        {adminName && (
          <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-secondary/40 px-3 py-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold uppercase text-background">
              {adminName.trim().charAt(0) || 'A'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {adminName}
              </p>
              {adminEmail && (
                <p className="truncate text-[11px] text-muted-foreground">
                  {adminEmail}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Link
            href={adminRoutes.storefront}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary/50 hover:text-foreground"
          >
            <Store className="size-4 shrink-0" />
            <span className="truncate">Ver tienda</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 disabled:pointer-events-none disabled:opacity-60"
          >
            {isLoggingOut ? (
              <LoaderCircle className="size-4 shrink-0 animate-spin" />
            ) : (
              <LogOut className="size-4 shrink-0" />
            )}
            <span className="truncate">Cerrar sesion</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/** Nombre de la seccion actual, para el encabezado movil. */
export function useCurrentSectionLabel(): string {
  const pathname = usePathname()
  const { categories } = useCategories()
  const all = [
    ...MAIN_ITEMS,
    ...categories.map(toCategoryItem),
    ...SETTINGS_ITEMS,
  ]
  // Se recorre de la ruta mas especifica a la mas general.
  const match = [...all]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isNavItemActive(pathname, item))
  return match?.label ?? 'Panel'
}
