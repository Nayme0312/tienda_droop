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
import * as productsService from '@/lib/admin/products-service'
import { ApiError } from '@/lib/api/client'
import { adminRoutes } from '@/lib/admin/routes'
import type { AdminProduct, ProductInput } from '@/lib/admin/types'

/**
 * Estado compartido de productos para todo el panel.
 *
 * Es la unica pieza que habla con la capa de servicios. Los componentes solo
 * consumen este contexto, asi que cuando el servicio pase de mock a API real
 * no hay que tocar ninguna pantalla.
 *
 * Tras cada mutacion se vuelve a pedir la lista a la API en lugar de parchear el
 * estado a mano: asi la interfaz siempre muestra lo que hay realmente en
 * PostgreSQL y no una version optimista que pudiera divergir.
 */
interface ProductsContextValue {
  products: AdminProduct[]
  isLoading: boolean
  isMutating: boolean
  error: string | null
  refresh: () => Promise<void>
  createProduct: (input: ProductInput) => Promise<AdminProduct>
  updateProduct: (
    id: string,
    input: Partial<ProductInput>,
  ) => Promise<AdminProduct>
  deleteProduct: (id: string) => Promise<void>
  toggleProductStatus: (id: string) => Promise<AdminProduct>
  /**
   * Estrella de destacado. Actualiza solo ese producto (al instante y luego con
   * la respuesta de la API), sin volver a pedir toda la lista.
   */
  setProductFeatured: (id: string, featured: boolean) => Promise<AdminProduct>
  /** Sube una imagen o un video y devuelve su URL definitiva. */
  uploadImage: (file: File) => Promise<string>
  /** Busqueda sincrona en la lista ya cargada (la usa la pagina de editar). */
  findProduct: (id: string) => AdminProduct | undefined
}

const ProductsContext = createContext<ProductsContextValue | null>(null)

function messageFrom(err: unknown): string {
  return err instanceof Error ? err.message : 'Ha ocurrido un error inesperado'
}

export function ProductsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Si la API responde 401 la sesion ha caducado mientras el panel estaba
   * abierto: se manda al login en lugar de mostrar un error que no lleva a
   * ninguna parte. Devuelve true si ya se ha gestionado.
   */
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
      const data = await productsService.getProducts()
      setProducts(data)
    } catch (err) {
      if (handleAuthError(err)) return
      setError(messageFrom(err))
    }
  }, [handleAuthError])

  useEffect(() => {
    let active = true
    // La carga inicial vive en un efecto, asi que el servicio solo se ejecuta
    // en el navegador y el almacen en memoria es unico por sesion.
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

  /** Envuelve una mutacion: marca el estado, refresca y propaga el error. */
  const mutate = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      setIsMutating(true)
      try {
        const result = await action()
        await load()
        return result
      } catch (err) {
        if (!handleAuthError(err)) setError(messageFrom(err))
        throw err
      } finally {
        setIsMutating(false)
      }
    },
    [load, handleAuthError],
  )

  const createProduct = useCallback(
    (input: ProductInput) => mutate(() => productsService.createProduct(input)),
    [mutate],
  )

  const updateProduct = useCallback(
    (id: string, input: Partial<ProductInput>) =>
      mutate(() => productsService.updateProduct(id, input)),
    [mutate],
  )

  const deleteProduct = useCallback(
    (id: string) => mutate(() => productsService.deleteProduct(id)),
    [mutate],
  )

  const toggleProductStatus = useCallback(
    (id: string) => mutate(() => productsService.toggleProductStatus(id)),
    [mutate],
  )

  // Excepcion a "refrescar tras cada mutacion": la estrella solo cambia un
  // campo de un producto, asi que se pinta al momento y se sustituye por la
  // fila que devuelve PostgreSQL. Si falla, la estrella vuelve a como estaba.
  const setProductFeatured = useCallback(
    async (id: string, featured: boolean) => {
      const patch = (isFeatured: boolean) =>
        setProducts((list) =>
          list.map((p) => (p.id === id ? { ...p, isFeatured } : p)),
        )
      patch(featured)
      try {
        const updated = await productsService.setProductFeatured(id, featured)
        setProducts((list) => list.map((p) => (p.id === id ? updated : p)))
        return updated
      } catch (err) {
        patch(!featured)
        // El aviso lo muestra la pantalla (toast); aqui solo la sesion caducada
        handleAuthError(err)
        throw err
      }
    },
    [handleAuthError],
  )

  // No refresca la lista: subir una imagen no cambia ningun producto.
  const uploadImage = useCallback(
    async (file: File) => {
      try {
        return await productsService.uploadProductImage(file)
      } catch (err) {
        handleAuthError(err)
        throw err
      }
    },
    [handleAuthError],
  )

  const findProduct = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products],
  )

  const value = useMemo<ProductsContextValue>(
    () => ({
      products,
      isLoading,
      isMutating,
      error,
      refresh,
      createProduct,
      updateProduct,
      deleteProduct,
      toggleProductStatus,
      setProductFeatured,
      uploadImage,
      findProduct,
    }),
    [
      products,
      isLoading,
      isMutating,
      error,
      refresh,
      createProduct,
      updateProduct,
      deleteProduct,
      toggleProductStatus,
      setProductFeatured,
      uploadImage,
      findProduct,
    ],
  )

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts(): ProductsContextValue {
  const context = useContext(ProductsContext)
  if (!context) {
    throw new Error('useProducts debe usarse dentro de <ProductsProvider>')
  }
  return context
}
