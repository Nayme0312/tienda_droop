'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { AdminHeader } from './admin-header'
import { AdminSidebar } from './admin-sidebar'

/**
 * Estructura del panel: sidebar fijo desde lg, menu hamburguesa por debajo.
 *
 * Es independiente de la tienda publica: no monta el Navbar ni el Footer, y
 * no modifica nada del layout raiz.
 */
export function AdminShell({
  children,
  adminName,
  adminEmail,
}: {
  children: React.ReactNode
  /** Administrador de la sesion, resuelto en el servidor por el layout. */
  adminName?: string
  adminEmail?: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  // Red de seguridad: si una navegacion ocurre sin pasar por el onClick de un
  // enlace del sidebar (boton atras del navegador, por ejemplo), el panel
  // movil no debe quedarse abierto.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fijo (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card/40 lg:block">
        <AdminSidebar adminName={adminName} adminEmail={adminEmail} />
      </aside>

      {/* Sidebar en Sheet (movil y tablet) */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="w-[17rem] gap-0 border-border bg-card p-0 sm:max-w-[17rem]"
        >
          {/* Radix exige titulo y descripcion accesibles en el dialogo. */}
          <SheetTitle className="sr-only">Menu del panel</SheetTitle>
          <SheetDescription className="sr-only">
            Navegacion del panel administrativo de STREETVIBE
          </SheetDescription>
          <AdminSidebar
            onNavigate={() => setMenuOpen(false)}
            adminName={adminName}
            adminEmail={adminEmail}
          />
        </SheetContent>
      </Sheet>

      {/* Contenido */}
      <div className="lg:pl-64">
        <AdminHeader onOpenMenu={() => setMenuOpen(true)} />
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
