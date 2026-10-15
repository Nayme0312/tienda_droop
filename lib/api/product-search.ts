import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { searchTokens } from '@/lib/search'

/**
 * Version en PostgreSQL de la busqueda por palabras de lib/search.ts: mismas
 * palabras, mismos campos y las mismas reglas, para que el buscador de
 * "Registrar venta" encuentre lo mismo que el listado del panel.
 *
 * Prisma no sabe ignorar tildes ni buscar dentro de los arrays de colores y
 * tallas sin distinguir mayusculas, asi que el filtro se hace con SQL: se une
 * todo el texto del producto, se pasa a minusculas y se le quitan las tildes
 * con translate() (no requiere la extension unaccent).
 */

/** Las letras con tilde y su version sin ella, en el mismo orden. */
const ACCENTED = 'áàäâéèëêíìïîóòöôúùüûñç'
const PLAIN = 'aaaaeeeeiiiioooouuuunc'

const PRODUCT_TEXT = Prisma.sql`translate(lower(concat_ws(' ', p.name, p.description, array_to_string(p.colors, ' '), array_to_string(p.sizes, ' '))), ${ACCENTED}, ${PLAIN})`

/** Escapa los comodines de LIKE para que "%" o "_" se busquen tal cual. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

/** Filtro de Prisma con los productos que contienen todas las palabras. */
export async function productSearchWhere(search: string): Promise<Prisma.ProductWhereInput> {
  const tokens = searchTokens(search)
  if (tokens.length === 0) return {}

  const conditions = tokens.map((token) => {
    // Codigo: los que empiezan por esos digitos ("100" -> 1000, 1001...).
    const byCode = /^\d{1,10}$/.test(token)
      ? Prisma.sql` OR p.code::text LIKE ${`${token}%`}`
      : Prisma.empty
    return Prisma.sql`(${PRODUCT_TEXT} LIKE ${`%${escapeLike(token)}%`} ESCAPE '\\'${byCode})`
  })

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM products p WHERE ${Prisma.join(conditions, ' AND ')}
  `
  return { id: { in: rows.map((row) => row.id) } }
}
