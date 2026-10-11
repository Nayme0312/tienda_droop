'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import * as sectionsService from '@/lib/admin/sections-service'
import type { AdminStoreSection } from '@/lib/admin/types'

interface CategoriesContextValue {
  /** Secciones de tienda (categorias), ordenadas por nombre. */
  categories: AdminStoreSection[]
  isLoading: boolean
  error: string | null
  /** Vuelve a pedir la lista; lo llama Secciones de tienda tras cada cambio. */
  refresh: () => Promise<void>
  /** Nombre de una categoria por su slug (el slug si aun no ha cargado). */
  labelFor: (slug: string) => string
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null)

/**
 * Categorias del panel, leidas de PostgreSQL una vez por sesion de panel.
 *
 * Las consumen el menu lateral, el formulario y los filtros de producto y las
 * paginas por categoria. Crear, editar o borrar una seccion llama a
 * `refresh()`, asi que todo el panel ve el cambio sin recargar.
 */
export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<AdminStoreSection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      setCategories(await sectionsService.getSections())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron cargar las categorias',
      )
    }
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      await refresh()
      if (active) setIsLoading(false)
    })()
    return () => {
      active = false
    }
  }, [refresh])

  const labelFor = useCallback(
    (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug,
    [categories],
  )

  const value = useMemo<CategoriesContextValue>(
    () => ({ categories, isLoading, error, refresh, labelFor }),
    [categories, isLoading, error, refresh, labelFor],
  )

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories(): CategoriesContextValue {
  const context = useContext(CategoriesContext)
  if (!context) {
    throw new Error('useCategories debe usarse dentro de <CategoriesProvider>')
  }
  return context
}
