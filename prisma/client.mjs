import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Cliente de Prisma para los scripts de linea de comandos (seed, create-admin).
 *
 * La aplicacion usa lib/db.ts; esto es el equivalente para Node suelto. La URL
 * sale siempre de DATABASE_URL, asi que estos scripts no pueden tocar otra base
 * de datos del servidor por error.
 */
export function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error(
      '\nFalta DATABASE_URL.\n' +
        'Ejecuta los scripts con la variable cargada, por ejemplo:\n' +
        '  node --env-file=.env prisma/seed.mjs\n',
    )
    process.exit(1)
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })
}
