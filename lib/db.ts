import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

/**
 * Cliente de Prisma compartido.
 *
 * En Prisma 7 la URL de conexion no sale del schema: se pasa al cliente a
 * traves del adaptador de driver. Solo se lee de DATABASE_URL, asi que ninguna
 * credencial vive en el codigo y las consultas nunca pueden acabar en otra base
 * de datos del servidor por accidente.
 *
 * En desarrollo se guarda en globalThis para que el hot reload de Next no abra
 * un pool de conexiones nuevo en cada recarga.
 */
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    'Falta DATABASE_URL. Copia .env.example a .env y define la conexion a PostgreSQL.',
  )
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

function createClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
