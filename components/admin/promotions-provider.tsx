'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import * as promotionsService from '@/lib/admin/promotions-service'
import { ApiError } from '@/lib/api/client'
import { adminRoutes } from '@/lib/admin/routes'
import type { AdminPromotion, PromotionInput } from '@/lib/admin/types'

/**
 * Estado compartido de promociones. Mismo patron que ProductsProvider: tras cada
 * mutacion se recarga desde la API, de forma que la interfaz siempre refleja lo
 * que hay en PostgreSQL.
 */
interface PromotionsContextValue {
  promotions: AdminPromotion[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  createPromotion: (input: PromotionInput) => Promise<AdminPromotion>
  updatePromotion: (
    id: string,
    input: Partial<PromotionInput>,
  ) => Promise<AdminPromotion>
  deletePromotion: (id: string) => Promise<void>
  togglePromotionStatus: (id: string) => Promise<AdminPromotion>
  findPromotion: (id: string) => AdminPromotion | undefined
}

const PromotionsContext = createContext<PromotionsContextValue | null>(null)

function messageFrom(err: unknown): string {
  return err instanceof Error ? err.message : 'Ha ocurrido un error inesperado'
}

export function PromotionsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [promotions, setPromotions] = useState<AdminPromotion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleAuthError = useCallback(
    (err: unknown): boolean => {
      if (err instanceof ApiError && err.isUnauthorized) {
        router.replace(adminRoutes.login)
        router.refresh()
        return true
      }
      return false
    },
    [router],
  )

  const load = useCallback(async () => {
    try {
      setError(null)
      setPromotions(await promotionsService.getPromotions())
    } catch (err) {
      if (handleAuthError(err)) return
      setError(messageFrom(err))
    }
  }, [handleAuthError])

  useEffect(() => {
    let active = true
    void (async () => {
      await load()
      if (active) setIsLoading(false)
    })()
    return () => {
      active = false
    }
  }, [load])

  const refresh = useCallback(async () => {
    await load()
  }, [load])

  const mutate = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      try {
        const result = await action()
        await load()
        return result
      } catch (err) {
        if (!handleAuthError(err)) setError(messageFrom(err))
        throw err
      }
    },
    [load, handleAuthError],
  )

  const createPromotion = useCallback(
    (input: PromotionInput) =>
      mutate(() => promotionsService.createPromotion(input)),
    [mutate],
  )

  const updatePromotion = useCallback(
    (id: string, input: Partial<PromotionInput>) =>
      mutate(() => promotionsService.updatePromotion(id, input)),
    [mutate],
  )

  const deletePromotion = useCallback(
    (id: string) => mutate(() => promotionsService.deletePromotion(id)),
    [mutate],
  )

  const togglePromotionStatus = useCallback(
    (id: string) => mutate(() => promotionsService.togglePromotionStatus(id)),
    [mutate],
  )

  const findPromotion = useCallback(
    (id: string) => promotions.find((p) => p.id === id),
    [promotions],
  )

  const value = useMemo<PromotionsContextValue>(
    () => ({
      promotions,
      isLoading,
      error,
      refresh,
      createPromotion,
      updatePromotion,
      deletePromotion,
      togglePromotionStatus,
      findPromotion,
    }),
    [
      promotions,
      isLoading,
      error,
      refresh,
      createPromotion,
      updatePromotion,
      deletePromotion,
      togglePromotionStatus,
      findPromotion,
    ],
  )

  return (
    <PromotionsContext.Provider value={value}>
      {children}
    </PromotionsContext.Provider>
  )
}

export function usePromotions(): PromotionsContextValue {
  const context = useContext(PromotionsContext)
  if (!context) {
    throw new Error('usePromotions debe usarse dentro de <PromotionsProvider>')
  }
  return context
}
