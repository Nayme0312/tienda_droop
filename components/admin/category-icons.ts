import { Crown, Pin, Shirt, Tag, type LucideIcon } from 'lucide-react'

/**
 * Icono de cada categoria. Vive aqui, y no en los datos, para que la categoria
 * siga siendo datos puros sin dependencias de UI. Las secciones de siempre
 * tienen icono propio; las creadas desde el panel usan una etiqueta.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  camisas: Shirt,
  gorras: Crown,
  pines: Pin,
}

export function getCategoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? Tag
}
