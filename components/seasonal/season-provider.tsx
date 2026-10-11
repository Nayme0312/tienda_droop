"use client"

import { createContext, useContext } from "react"
import { usePathname } from "next/navigation"
import { ADMIN_BASE_PATH } from "@/lib/admin/routes"
import type { SeasonSlug } from "@/lib/seasons/registry"

/**
 * Temporada activa (fecha especial), resuelta en el servidor por el layout
 * raiz a partir de PostgreSQL. null = diseno normal de la tienda.
 */
const SeasonContext = createContext<SeasonSlug | null>(null)

export function SeasonProvider({
  season,
  children,
}: {
  season: SeasonSlug | null
  children: React.ReactNode
}) {
  return (
    <SeasonContext.Provider value={season}>{children}</SeasonContext.Provider>
  )
}

/**
 * Temporada que debe pintar la tienda publica. En el panel administrativo
 * siempre es null: las fechas especiales solo decoran la tienda.
 */
export function useStoreSeason(): SeasonSlug | null {
  const season = useContext(SeasonContext)
  const pathname = usePathname()
  if (pathname?.startsWith(ADMIN_BASE_PATH)) return null
  return season
}
