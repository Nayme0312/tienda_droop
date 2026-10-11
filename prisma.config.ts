import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

/**
 * Configuracion de la CLI de Prisma (migrate, db seed, studio).
 *
 * En Prisma 7 las URLs de conexion se declaran aqui y no en schema.prisma.
 * AISLAMIENTO: `datasource.url` es lo unico que determina sobre que base de
 * datos actuan las migraciones, y `shadowDatabaseUrl` fija de forma explicita
 * la base auxiliar de `migrate dev`, para que Prisma no cree ni borre bases con
 * nombres propios en un servidor PostgreSQL compartido con otros proyectos.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --env-file=.env prisma/seed.mjs',
  },
  datasource: {
    url: env('DATABASE_URL'),
    shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
  },
})
