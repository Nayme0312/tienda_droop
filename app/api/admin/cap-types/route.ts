import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import {
  assertSameOrigin,
  conflict,
  jsonCreated,
  jsonOk,
  readJsonBody,
  requireAdmin,
  toErrorResponse,
} from '@/lib/api/http'
import { parseOrThrow } from '@/lib/api/validate'
import { capTypeSelect, toAdminCapType } from '@/lib/api/cap-type-dto'
import { createCapTypeSchema, slugifyCapType } from '@/lib/caps/cap-types'

/** GET /api/admin/cap-types — todos los tipos, activos e inactivos. */
export async function GET() {
  try {
    await requireAdmin()

    const rows = await prisma.capType.findMany({
      orderBy: { name: 'asc' },
      select: capTypeSelect,
    })
    return jsonOk(rows.map(toAdminCapType))
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * POST /api/admin/cap-types — crea un tipo de gorra.
 *
 * El slug se deriva del nombre: dos tipos que solo se diferencian en
 * mayusculas o tildes ("Cerrada" / "cerrada") se consideran el mismo.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    await requireAdmin()

    const input = parseOrThrow(createCapTypeSchema, await readJsonBody(request))
    const slug = slugifyCapType(input.name)

    const existing = await prisma.capType.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (existing) {
      throw conflict(`Ya existe un tipo de gorra llamado "${input.name}".`)
    }

    const created = await prisma.capType.create({
      data: {
        name: input.name,
        slug,
        isActive: input.isActive,
        usesFittedSizes: input.usesFittedSizes,
      },
      select: capTypeSelect,
    })
    return jsonCreated(toAdminCapType(created))
  } catch (error) {
    return toErrorResponse(error)
  }
}
