"use client"

import { usePathname } from "next/navigation"
import KineticGrid from "@/components/ui/kinetic-grid"
import { ADMIN_BASE_PATH } from "@/lib/admin/routes"

/**
 * Fondo animado de la tienda publica (cuadricula interactiva). En el panel
 * administrativo no se renderiza: su diseno queda intacto. El Hero lo excluye
 * con `data-kinetic-grid-exclude` para conservar su video.
 */
export function StoreBackground() {
  const pathname = usePathname()
  if (pathname?.startsWith(ADMIN_BASE_PATH)) return null
  return <KineticGrid />
}
