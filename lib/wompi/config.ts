/**
 * Configuracion de Wompi, leida SOLO de variables de entorno y SOLO en el
 * servidor. Ninguna de estas variables lleva el prefijo NEXT_PUBLIC_, asi que
 * Next nunca las incluye en el JavaScript del navegador. Incluso la llave
 * publica se queda aqui: la URL del checkout se construye en el servidor.
 *
 * Cambiar de pruebas a produccion es solo cambiar variables:
 *   WOMPI_ENV=sandbox     + llaves pub_test_ / test_integrity_ / test_events_
 *   WOMPI_ENV=production  + llaves pub_prod_ / prod_integrity_ / prod_events_
 */

export type WompiEnvironment = 'sandbox' | 'production'

export interface WompiConfig {
  environment: WompiEnvironment
  /** Base de la API REST del ambiente (consulta de transacciones). */
  apiUrl: string
  /** Web Checkout: es la misma URL en ambos ambientes; manda la llave. */
  checkoutUrl: string
  publicKey: string
  integritySecret: string
  eventsSecret: string
}

const API_URLS: Record<WompiEnvironment, string> = {
  sandbox: 'https://sandbox.wompi.co/v1',
  production: 'https://production.wompi.co/v1',
}

/** Prefijo que deben tener las llaves de cada ambiente. */
const KEY_PREFIXES: Record<WompiEnvironment, { pub: string; integrity: string; events: string }> = {
  sandbox: { pub: 'pub_test_', integrity: 'test_integrity_', events: 'test_events_' },
  production: { pub: 'pub_prod_', integrity: 'prod_integrity_', events: 'prod_events_' },
}

export class WompiConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WompiConfigError'
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new WompiConfigError(
      `Falta la variable de entorno ${name}. Revisa .env.example (seccion Wompi).`,
    )
  }
  return value
}

/**
 * Devuelve la configuracion validada. Lanza WompiConfigError si falta algo o si
 * las llaves no corresponden al ambiente: asi es imposible cobrar de verdad con
 * WOMPI_ENV=sandbox o firmar con una llave de pruebas en produccion.
 */
export function getWompiConfig(): WompiConfig {
  const rawEnv = (process.env.WOMPI_ENV ?? 'sandbox').trim().toLowerCase()
  if (rawEnv !== 'sandbox' && rawEnv !== 'production') {
    throw new WompiConfigError('WOMPI_ENV debe ser "sandbox" o "production".')
  }
  const environment: WompiEnvironment = rawEnv

  const publicKey = required('WOMPI_PUBLIC_KEY')
  const integritySecret = required('WOMPI_INTEGRITY_SECRET')
  const eventsSecret = required('WOMPI_EVENTS_SECRET')

  const prefixes = KEY_PREFIXES[environment]
  const mismatched = [
    ['WOMPI_PUBLIC_KEY', publicKey, prefixes.pub],
    ['WOMPI_INTEGRITY_SECRET', integritySecret, prefixes.integrity],
    ['WOMPI_EVENTS_SECRET', eventsSecret, prefixes.events],
  ].find(([, value, prefix]) => !value.startsWith(prefix))
  if (mismatched) {
    throw new WompiConfigError(
      `${mismatched[0]} no corresponde al ambiente "${environment}" (debe empezar por "${mismatched[2]}").`,
    )
  }

  return {
    environment,
    apiUrl: API_URLS[environment],
    checkoutUrl: 'https://checkout.wompi.co/p/',
    publicKey,
    integritySecret,
    eventsSecret,
  }
}
