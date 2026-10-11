import { compare, hash } from 'bcryptjs'

/**
 * Hash de contrasenas con bcrypt.
 *
 * Coste 12: por encima del minimo que recomienda OWASP y asumible para un
 * panel con un solo administrador. Se usa bcryptjs (JavaScript puro) en lugar
 * del binding nativo para no depender de compilacion en Windows.
 *
 * En la base de datos solo se guarda el hash: la contrasena en claro no se
 * almacena, no se registra en logs y no se devuelve nunca al frontend.
 */
const BCRYPT_ROUNDS = 12

/**
 * Hash con el que comparar cuando el email no existe. Sirve para que el tiempo
 * de respuesta de "email inexistente" se parezca al de "contrasena incorrecta"
 * y no se pueda deducir que cuentas existen midiendo la latencia.
 */
const DUMMY_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.Ck6Ry5gYyPrBqVcCaWQ0LhNFpVhgHMi'

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS)
}

export function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(plain, passwordHash)
}

/** Consume el mismo tiempo que una verificacion real y siempre falla. */
export async function fakeVerifyPassword(plain: string): Promise<false> {
  await compare(plain, DUMMY_HASH)
  return false
}
