import { randomBytes } from 'node:crypto'
import { hash } from 'bcryptjs'

/**
 * Creacion del administrador, compartida por el seed y por
 * scripts/create-admin.mjs.
 *
 * Reglas:
 *  - La contrasena NUNCA esta escrita en el codigo.
 *  - Si no se proporciona una, se genera aleatoria y se muestra UNA sola vez.
 *  - En la base de datos solo se guarda el hash bcrypt.
 */
const BCRYPT_ROUNDS = 12

/** Contrasena aleatoria de 24 caracteres, apta para copiar y pegar. */
export function generatePassword() {
  return randomBytes(18).toString('base64url')
}

/**
 * Crea el administrador si no existe. Con `resetPassword: true` actualiza la
 * contrasena de uno que ya exista.
 *
 * Devuelve { admin, created, plainPassword }. `plainPassword` solo viene
 * cuando se ha generado o establecido en esta llamada.
 */
export async function upsertAdmin(
  prisma,
  { email, name, password, resetPassword = false },
) {
  const normalizedEmail = email.trim().toLowerCase()

  const existing = await prisma.admin.findUnique({
    where: { email: normalizedEmail },
  })

  if (existing && !resetPassword) {
    return { admin: existing, created: false, plainPassword: null }
  }

  const plainPassword = password || generatePassword()

  if (plainPassword.length < 12) {
    throw new Error('La contrasena del administrador debe tener 12 caracteres o mas.')
  }

  const passwordHash = await hash(plainPassword, BCRYPT_ROUNDS)

  if (existing) {
    const admin = await prisma.admin.update({
      where: { id: existing.id },
      data: { passwordHash, name: name || existing.name },
    })
    return { admin, created: false, plainPassword }
  }

  const admin = await prisma.admin.create({
    data: {
      email: normalizedEmail,
      name: name || 'Administrador',
      passwordHash,
    },
  })
  return { admin, created: true, plainPassword }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Cambia el email de un administrador conservando su contrasena.
 *
 * NO toca `passwordHash`: solo se actualiza la columna `email`. Por eso la
 * contrasena actual sigue siendo valida sin volver a hashearla y sin que la
 * contrasena en claro intervenga en ninguna parte del proceso.
 */
export async function changeAdminEmail(prisma, { from, to }) {
  const current = String(from).trim().toLowerCase()
  const next = String(to).trim().toLowerCase()

  if (!EMAIL_PATTERN.test(next)) {
    throw new Error(`"${to}" no es un email valido.`)
  }

  const admin = await prisma.admin.findUnique({ where: { email: current } })
  if (!admin) {
    throw new Error(`No existe ningun administrador con el email ${current}.`)
  }

  if (current === next) {
    return { admin, changed: false }
  }

  const taken = await prisma.admin.findUnique({ where: { email: next } })
  if (taken) {
    throw new Error(`Ya existe otro administrador con el email ${next}.`)
  }

  const updated = await prisma.admin.update({
    where: { id: admin.id },
    data: { email: next },
    select: { id: true, name: true, email: true },
  })

  return { admin: updated, changed: true }
}

/** Muestra la contrasena una unica vez, con un aviso claro. */
export function printPasswordOnce(email, plainPassword) {
  console.log('\n' + '='.repeat(64))
  console.log('  CREDENCIALES DEL ADMINISTRADOR')
  console.log('='.repeat(64))
  console.log(`  Email:      ${email}`)
  console.log(`  Contrasena: ${plainPassword}`)
  console.log('='.repeat(64))
  console.log('  Guardala ahora: no se vuelve a mostrar y no se puede')
  console.log('  recuperar (en la base de datos solo esta su hash).')
  console.log('='.repeat(64) + '\n')
}
