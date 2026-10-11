import { prisma } from '@/lib/db'
import { jsonOk, notFound, requireAdmin, toErrorResponse } from '@/lib/api/http'

/** Administrador de la sesion actual. Nunca incluye passwordHash. */
export async function GET() {
  try {
    const session = await requireAdmin()

    const admin = await prisma.admin.findUnique({
      where: { id: session.sub },
      select: { id: true, name: true, email: true },
    })

    if (!admin) throw notFound('La cuenta de esta sesion ya no existe.')

    return jsonOk({ admin })
  } catch (error) {
    return toErrorResponse(error)
  }
}
