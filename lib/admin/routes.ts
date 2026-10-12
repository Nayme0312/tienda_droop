/**
 * Rutas del panel administrativo, centralizadas.
 *
 * La carpeta fisica en `app/` tiene que llamarse igual que ADMIN_BASE_PATH
 * (asi funciona el enrutado por sistema de archivos de Next), pero ningun
 * componente escribe la ruta a mano: todos los enlaces salen de aqui.
 * Si mas adelante cambiamos el segmento secreto, se toca este archivo y
 * se renombra la carpeta.
 */
export const ADMIN_BASE_PATH = '/streepanel-84m2'

export const adminRoutes = {
  login: `${ADMIN_BASE_PATH}/login`,
  dashboard: ADMIN_BASE_PATH,
  products: `${ADMIN_BASE_PATH}/productos`,
  newProduct: `${ADMIN_BASE_PATH}/productos/nuevo`,
  editProduct: (id: string) => `${ADMIN_BASE_PATH}/productos/${id}/editar`,
  category: (slug: string) => `${ADMIN_BASE_PATH}/${slug}`,
  sections: `${ADMIN_BASE_PATH}/secciones`,
  specialDates: `${ADMIN_BASE_PATH}/fechas-especiales`,
  marquee: `${ADMIN_BASE_PATH}/cinta-marquesina`,
  hero: `${ADMIN_BASE_PATH}/hero`,
  testimonials: `${ADMIN_BASE_PATH}/testimonios`,
  promotions: `${ADMIN_BASE_PATH}/promociones`,
  newPromotion: `${ADMIN_BASE_PATH}/promociones/nueva`,
  editPromotion: (id: string) => `${ADMIN_BASE_PATH}/promociones/${id}/editar`,
  orders: `${ADMIN_BASE_PATH}/pedidos`,
  settings: `${ADMIN_BASE_PATH}/configuracion`,
  /** Tienda publica. */
  storefront: '/',
} as const
