/**
 * Constantes compartidas por el formulario del boletin (components/footer.tsx)
 * y su endpoint (app/api/newsletter/route.ts). Sin dependencias de servidor:
 * se importa desde el cliente.
 */

/** Accion de Turnstile: el servidor rechaza tokens emitidos para otra accion. */
export const NEWSLETTER_TURNSTILE_ACTION = 'newsletter'
