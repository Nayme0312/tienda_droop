'use client'

import Link from 'next/link'
import { ExternalLink, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { adminRoutes } from '@/lib/admin/routes'
import { useCurrentSectionLabel } from './admin-sidebar'

/**
 * Barra superior del panel. Es fija para que el boton del menu siga accesible
 * al desplazarse en movil. El titulo se deriva de la ruta actual, asi que
 * ninguna pagina tiene que pasarlo como prop.
 */
export function AdminHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const section = useCurrentSectionLabel()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onOpenMenu}
        aria-label="Abrir menu de navegacion"
        className="lg:hidden"
      >
        <Menu className="size-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {section}
        </p>
      </div>

      <Button
        asChild
        variant="ghost"
        size="sm"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <Link href={adminRoutes.storefront}>
          <ExternalLink className="size-3.5" />
          <span className="hidden sm:inline">Ver tienda</span>
        </Link>
      </Button>
    </header>
  )
}
