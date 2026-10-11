/** Id de la unica fila de la tabla hero_settings. */
export const HERO_ID = 'main'

/**
 * Video que mostraba el Hero antes de ser administrable. Es el valor con el que
 * nace la configuracion y el que usa la tienda si la base de datos no responde.
 */
export const DEFAULT_HERO_VIDEO = '/images/videohero1-scroll.mp4'

export type HeroMediaKind = 'video' | 'image'

/** Lo que necesita la tienda para pintar el Hero. */
export interface HeroMedia {
  type: HeroMediaKind
  src: string
}
