"use client"

import { useStoreSeason } from "./season-provider"
import { Snowfall } from "./snowfall"

/**
 * Efectos globales de la temporada activa (los que no pertenecen a ningun
 * componente concreto). Sin temporada, o dentro del panel, no renderiza nada:
 * la tienda queda exactamente con su diseno normal.
 *
 * El marcador `data-season` lo usan las reglas de globals.css para los
 * detalles de color, de modo que esos estilos existen solo mientras este
 * componente lo renderiza.
 */
export function SeasonalEffects() {
  const season = useStoreSeason()

  if (season === "navidad") {
    return (
      <>
        <span data-season="navidad" hidden />
        <Snowfall />
      </>
    )
  }

  return null
}
