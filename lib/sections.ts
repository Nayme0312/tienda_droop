/**
 * Reglas compartidas de las secciones de tienda (tabla `categories`).
 *
 * Las secciones viven en PostgreSQL y se crean, editan y borran desde el panel.
 * Este modulo no importa nada de servidor: lo usan la API, el panel y la
 * tienda.
 */

/** Formato del slug: minusculas, numeros y guiones; sin guion al inicio/final. */
export const SECTION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const SECTION_SLUG_MAX = 40

/**
 * Slugs que no puede usar una seccion porque chocarian con otras rutas: la
 * tienda sirve cada seccion en /:slug y el panel su listado en
 * /streepanel-84m2/:slug.
 */
export const RESERVED_SECTION_SLUGS = new Set([
  // Tienda
  'api',
  'checkout',
  'images',
  'streepanel-84m2',
  // Paginas legales (app/(legal)/)
  'terminos-y-condiciones',
  'politica-de-privacidad',
  'politicas-de-envio-y-devoluciones',
  // Panel
  'login',
  'productos',
  'promociones',
  'pedidos',
  'secciones',
  'fechas-especiales',
  'cinta-marquesina',
  'hero',
  'configuracion',
])

/**
 * Secciones con las que nacio la tienda. Su slug no se puede cambiar porque
 * hay logica que depende de el (p. ej. el formulario simplificado de pines),
 * pero su nombre, descripcion y visibilidad si.
 */
export const BUILT_IN_SECTION_SLUGS = ['camisas', 'gorras', 'pines'] as const

export function isBuiltInSection(slug: string): boolean {
  return (BUILT_IN_SECTION_SLUGS as readonly string[]).includes(slug)
}

/**
 * Textos por defecto de las secciones de siempre, para cuando su descripcion
 * en la base de datos esta vacia: `short` en la portada, `long` en su pagina y
 * `meta` en los metadatos. Son los textos que la tienda mostraba antes.
 */
const BUILT_IN_COPY: Record<string, { short: string; long: string; meta: string }> = {
  camisas: {
    short: 'Disenos unicos para destacar en cualquier ocasion.',
    long: 'Disenos unicos para destacar en cualquier ocasion. Telas premium, estampados de alta durabilidad y fit perfecto.',
    meta: 'Descubre nuestra coleccion de camisas streetwear premium. Disenos unicos para destacar.',
  },
  gorras: {
    short: 'El complemento perfecto para tu look.',
    long: 'El complemento perfecto para tu look. Gorras bordadas, ajustables y con estilo unico para marcar tendencia.',
    meta: 'Descubre nuestra coleccion de gorras streetwear premium. El complemento perfecto para tu look.',
  },
  pines: {
    short: 'Accesorios metalicos para personalizar tus gorras.',
    long: 'Accesorios metalicos para personalizar tus gorras. Pines esmaltados con broche mariposa y disenos unicos.',
    meta: 'Descubre nuestra coleccion de pines metalicos. Accesorios para personalizar tus gorras.',
  },
}

/** Texto de la seccion en la portada. */
export function sectionShortCopy(slug: string, description: string): string {
  return description.trim() || BUILT_IN_COPY[slug]?.short || ''
}

/** Texto de la seccion en su propia pagina. */
export function sectionLongCopy(slug: string, description: string): string {
  return description.trim() || BUILT_IN_COPY[slug]?.long || ''
}

/** Descripcion para los metadatos (buscadores, redes). */
export function sectionMetaDescription(
  slug: string,
  name: string,
  description: string,
): string {
  return (
    description.trim() ||
    BUILT_IN_COPY[slug]?.meta ||
    `Descubre nuestra coleccion de ${name.toLowerCase()} en STREETVIBE.`
  )
}

/** "Accesorios de Verano" -> "accesorios-de-verano" */
export function slugifySection(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SECTION_SLUG_MAX)
    .replace(/-+$/g, '')
}

/** Mensaje de error del slug, o null si es valido. */
export function sectionSlugError(slug: string): string | null {
  if (!slug) return 'El identificador no puede estar vacio'
  if (slug.length > SECTION_SLUG_MAX) {
    return `Maximo ${SECTION_SLUG_MAX} caracteres`
  }
  if (!SECTION_SLUG_PATTERN.test(slug)) {
    return 'Solo minusculas, numeros y guiones (p. ej. "accesorios-verano")'
  }
  if (RESERVED_SECTION_SLUGS.has(slug)) {
    return 'Ese identificador esta reservado por la tienda'
  }
  return null
}
