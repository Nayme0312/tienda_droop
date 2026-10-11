import { createPrismaClient } from '../prisma/client.mjs'
import {
  changeAdminEmail,
  printPasswordOnce,
  upsertAdmin,
} from '../prisma/admin-account.mjs'

/**
 * Crea el administrador inicial, o restablece su contrasena.
 *
 *   node --env-file=.env scripts/create-admin.mjs
 *   node --env-file=.env scripts/create-admin.mjs --reset
 *   node --env-file=.env scripts/create-admin.mjs --email otro@dominio.com
 *
 * Cambiar el email conservando la contrasena actual:
 *   node --env-file=.env scripts/create-admin.mjs --email actual@x.com --new-email nuevo@y.com
 *
 * O con los atajos de npm:
 *   npm run admin:create
 *   npm run admin:reset
 *   npm run admin:email -- --email actual@x.com --new-email nuevo@y.com
 *
 * La contrasena nunca se escribe en el codigo: se toma de ADMIN_PASSWORD si
 * existe y, si no, se genera aleatoria y se muestra una unica vez. En la base de
 * datos solo se guarda el hash bcrypt.
 *
 * NOTA: no hay registro publico de administradores a proposito. La unica forma
 * de crear una cuenta es este script, con acceso al servidor.
 */
function parseArgs(argv) {
  const args = { reset: false, email: null, name: null, newEmail: null }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--reset') args.reset = true
    else if (arg === '--email') args.email = argv[++i]
    else if (arg === '--name') args.name = argv[++i]
    else if (arg === '--new-email') args.newEmail = argv[++i]
  }

  return args
}

const prisma = createPrismaClient()

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const email = args.email || process.env.ADMIN_EMAIL

  if (!email) {
    console.error(
      '\nFalta el email. Define ADMIN_EMAIL en .env o pasa --email tu@dominio.com\n',
    )
    process.exitCode = 1
    return
  }

  // Cambio de email: no pasa por upsertAdmin, porque no debe tocar la
  // contrasena. Solo se actualiza la columna email.
  if (args.newEmail) {
    const { admin, changed } = await changeAdminEmail(prisma, {
      from: email,
      to: args.newEmail,
    })
    if (changed) {
      console.log(`\nEmail actualizado: ${email} -> ${admin.email}`)
      console.log('La contrasena no ha cambiado: sigue siendo la misma.\n')
      console.log('Recuerda actualizar ADMIN_EMAIL en .env para que el seed')
      console.log('no vuelva a crear un administrador con el email anterior.\n')
    } else {
      console.log(`\nEl administrador ya tiene el email ${admin.email}. Sin cambios.\n`)
    }
    return
  }

  const { admin, created, plainPassword } = await upsertAdmin(prisma, {
    email,
    name: args.name || process.env.ADMIN_NAME,
    password: process.env.ADMIN_PASSWORD,
    resetPassword: args.reset,
  })

  if (created) {
    console.log(`\nAdministrador creado: ${admin.email}`)
  } else if (args.reset) {
    console.log(`\nContrasena restablecida para: ${admin.email}`)
  } else {
    console.log(`\nEl administrador ${admin.email} ya existe. Sin cambios.`)
    console.log('Para restablecer su contrasena:  npm run admin:reset\n')
    return
  }

  if (plainPassword) printPasswordOnce(admin.email, plainPassword)
}

main()
  .catch((error) => {
    console.error('\nError:', error.message ?? error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
