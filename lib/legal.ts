import { WHATSAPP_NUMBER } from "@/lib/contact"

/**
 * Datos del comercio y condiciones que usan las paginas legales
 * (app/(legal)/...) y el footer.
 *
 * IMPORTANTE: los valores entre corchetes son marcadores que hay que
 * reemplazar por los datos reales antes de publicar. El Estatuto del
 * Consumidor (Ley 1480 de 2011, art. 50) obliga a las tiendas en linea a
 * informar nombre o razon social, NIT, direccion, telefono y correo.
 */
export const LEGAL_INFO = {
  storeName: "STREETVIBE",
  /** Persona natural o juridica responsable de la tienda. */
  legalName: "[RAZÓN SOCIAL O NOMBRE DEL TITULAR]",
  /** NIT o cedula del responsable. */
  taxId: "[NIT]",
  address: "[DIRECCIÓN FÍSICA DE NOTIFICACIÓN]",
  city: "[CIUDAD], Colombia",
  /** Correo para PQR, garantias, retracto y Habeas Data. */
  email: "[CORREO DE ATENCIÓN AL CLIENTE]",
  /** Telefono / WhatsApp en formato legible. */
  phone: `+${WHATSAPP_NUMBER.slice(0, 2)} ${WHATSAPP_NUMBER.slice(2, 5)} ${WHATSAPP_NUMBER.slice(5, 8)} ${WHATSAPP_NUMBER.slice(8)}`,
  website: "[DOMINIO DE LA TIENDA]",
  /** Horario de atencion de PQR. */
  supportHours: "lunes a sábado de 9:00 a. m. a 6:00 p. m.",

  // --- Envios (ajustar a la operacion real) --------------------------------
  /** Dias habiles para alistar el pedido una vez aprobado el pago. */
  dispatchDays: "uno (1) a tres (3) días hábiles",
  /** Plazos de entrega estimados por la transportadora. */
  deliveryMainCities: "dos (2) a cinco (5) días hábiles",
  deliveryOtherAreas: "cinco (5) a ocho (8) días hábiles",
  /** Como se cobra el envio. */
  shippingCost:
    "El valor del envío depende de la ciudad de destino y se informa antes de despachar el pedido. Si no está incluido en el total pagado en línea, te lo confirmaremos por WhatsApp o correo electrónico y no se despachará sin tu aceptación.",

  // --- Cambios y garantia ---------------------------------------------------
  /** Plazo voluntario para cambios por talla, color o referencia. */
  exchangeDays: "treinta (30) días calendario",
  /** Termino de garantia legal anunciado para los productos. */
  warrantyTerm: "noventa (90) días calendario",

  /** Fecha de la ultima actualizacion de los textos legales. */
  lastUpdated: "12 de octubre de 2026",
} as const

/** Paginas legales enlazadas en el footer, en este orden. */
export const LEGAL_PAGES = [
  { href: "/terminos-y-condiciones", label: "Términos y condiciones" },
  { href: "/politica-de-privacidad", label: "Política de privacidad" },
  { href: "/politicas-de-envio-y-devoluciones", label: "Envíos y devoluciones" },
] as const

/** Autoridad de proteccion al consumidor y de datos personales. */
export const SIC_URL = "https://www.sic.gov.co"
