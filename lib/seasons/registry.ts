/**
 * Temporadas (fechas especiales) que la tienda sabe pintar.
 *
 * Cada temporada necesita tres cosas:
 *  1. Una entrada aqui (slug, nombre y descripcion para el panel).
 *  2. Una fila en la tabla `special_dates` con el mismo slug (migracion).
 *  3. Su tema visual en components/seasonal/ (efectos y decoraciones).
 *
 * Para anadir Halloween, San Valentin, Black Friday... se repiten esos tres
 * pasos; el panel, la API y la carga en la tienda no cambian.
 */
export const SEASONS = [
  {
    slug: 'navidad',
    name: 'Navidad',
    description:
      'Nieve suave cayendo, luces en el menu, un gorro navideno en la tercera camisa y detalles en rojo y verde.',
  },
] as const

export type SeasonSlug = (typeof SEASONS)[number]['slug']

export const SEASON_SLUGS = SEASONS.map((season) => season.slug) as SeasonSlug[]

export function isSeasonSlug(value: string): value is SeasonSlug {
  return SEASON_SLUGS.includes(value as SeasonSlug)
}

export function getSeasonInfo(slug: SeasonSlug) {
  return SEASONS.find((season) => season.slug === slug) ?? SEASONS[0]
}
