'use client'

import { useState } from 'react'
import { LoaderCircle, Save, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { LOW_STOCK_THRESHOLD } from '@/components/admin/status-badge'
import Link from 'next/link'
import { useCategories } from '@/components/admin/categories-provider'
import { adminRoutes } from '@/lib/admin/routes'

/**
 * Configuracion del panel.
 *
 * ETAPA 1: interfaz completa con estado local. Nada persiste: al recargar
 * vuelven los valores iniciales. En la etapa de backend cada seccion se
 * conectara a su endpoint y el formulario no tendra que cambiar de forma.
 */
export default function AdminSettingsPage() {
  const { categories } = useCategories()
  // Informacion de la tienda
  const [storeName, setStoreName] = useState('STREETVIBE')
  const [tagline, setTagline] = useState('Estilo Que Te Define')
  const [storeDescription, setStoreDescription] = useState(
    'Tienda de ropa streetwear premium. Camisas y gorras con disenos unicos para todos los estilos.',
  )
  const [contactEmail, setContactEmail] = useState('hola@streetvibe.co')
  const [whatsapp, setWhatsapp] = useState('')

  // Configuracion general
  const [currency, setCurrency] = useState('COP')
  const [lowStockThreshold, setLowStockThreshold] = useState(
    String(LOW_STOCK_THRESHOLD),
  )
  const [freeShippingFrom, setFreeShippingFrom] = useState('150000')

  // Preferencias
  const [notifyLowStock, setNotifyLowStock] = useState(true)
  const [notifyNewOrders, setNotifyNewOrders] = useState(true)
  const [showSoldOut, setShowSoldOut] = useState(true)

  // Apariencia
  const [theme, setTheme] = useState('dark')
  const [productsPerRow, setProductsPerRow] = useState('4')

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    // Guardado simulado: sin backend todavia.
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsSaving(false)
    toast.success('Configuracion guardada', {
      description: 'Solo en memoria: aun no hay backend conectado.',
    })
  }

  return (
    <form onSubmit={handleSave}>
      <AdminPageHeader
        title="Configuracion"
        description="Ajustes generales de la tienda y del panel."
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <p className="leading-relaxed">
          Esta pantalla todavia es solo visual. Los valores no se guardan en
          ningun sitio: se conectaran en la etapa de backend.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Informacion de la tienda */}
          <SettingsSection
            title="Informacion de la tienda"
            description="Datos que identifican la marca de cara al cliente."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SettingField label="Nombre de la tienda" htmlFor="storeName">
                <Input
                  id="storeName"
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  className="bg-card/60"
                />
              </SettingField>

              <SettingField label="Eslogan" htmlFor="tagline">
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={(event) => setTagline(event.target.value)}
                  className="bg-card/60"
                />
              </SettingField>
            </div>

            <SettingField label="Descripcion" htmlFor="storeDescription">
              <Textarea
                id="storeDescription"
                value={storeDescription}
                onChange={(event) => setStoreDescription(event.target.value)}
                rows={3}
                className="resize-y bg-card/60"
              />
            </SettingField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SettingField label="Email de contacto" htmlFor="contactEmail">
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className="bg-card/60"
                />
              </SettingField>

              <SettingField
                label="WhatsApp de pedidos"
                htmlFor="whatsapp"
                hint="La tienda abre WhatsApp sin numero fijo: aqui se configurara."
              >
                <Input
                  id="whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  placeholder="+57 300 000 0000"
                  className="bg-card/60"
                />
              </SettingField>
            </div>
          </SettingsSection>

          {/* Configuracion general */}
          <SettingsSection
            title="Configuracion general"
            description="Reglas de precio, inventario y envio."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SettingField label="Moneda" htmlFor="currency">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency" className="w-full bg-card/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COP">COP - Peso colombiano</SelectItem>
                    <SelectItem value="USD">USD - Dolar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </SettingField>

              <SettingField
                label="Aviso de stock bajo"
                htmlFor="lowStockThreshold"
                hint="Unidades o menos"
              >
                <Input
                  id="lowStockThreshold"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={lowStockThreshold}
                  onChange={(event) =>
                    setLowStockThreshold(event.target.value)
                  }
                  className="bg-card/60"
                />
              </SettingField>

              <SettingField
                label="Envio gratis desde"
                htmlFor="freeShippingFrom"
                hint="0 = desactivado"
              >
                <Input
                  id="freeShippingFrom"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={freeShippingFrom}
                  onChange={(event) =>
                    setFreeShippingFrom(event.target.value)
                  }
                  className="bg-card/60"
                />
              </SettingField>
            </div>
          </SettingsSection>

          {/* Preferencias */}
          <SettingsSection
            title="Preferencias"
            description="Avisos del panel y comportamiento del catalogo."
          >
            <ToggleRow
              label="Avisar cuando el stock este bajo"
              description={`Notificar en el panel cuando un producto baje de ${lowStockThreshold || 0} unidades.`}
              checked={notifyLowStock}
              onCheckedChange={setNotifyLowStock}
            />
            <ToggleRow
              label="Avisar de pedidos nuevos"
              description="Requiere el modulo de pedidos, que llega en una etapa posterior."
              checked={notifyNewOrders}
              onCheckedChange={setNotifyNewOrders}
            />
            <ToggleRow
              label="Mostrar productos agotados en la tienda"
              description="Si se desactiva, los productos sin stock se ocultan del catalogo publico."
              checked={showSoldOut}
              onCheckedChange={setShowSoldOut}
            />
          </SettingsSection>

          {/* Apariencia */}
          <SettingsSection
            title="Apariencia"
            description="Presentacion de la tienda publica."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SettingField label="Tema" htmlFor="theme">
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger id="theme" className="w-full bg-card/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Oscuro</SelectItem>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="system">Segun el sistema</SelectItem>
                  </SelectContent>
                </Select>
              </SettingField>

              <SettingField
                label="Productos por fila"
                htmlFor="productsPerRow"
                hint="En pantallas grandes"
              >
                <Select
                  value={productsPerRow}
                  onValueChange={setProductsPerRow}
                >
                  <SelectTrigger
                    id="productsPerRow"
                    className="w-full bg-card/60"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 productos</SelectItem>
                    <SelectItem value="4">4 productos</SelectItem>
                    <SelectItem value="5">5 productos</SelectItem>
                  </SelectContent>
                </Select>
              </SettingField>
            </div>
          </SettingsSection>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          <div className="lg:sticky lg:top-20 lg:space-y-6">
            <SettingsSection title="Categorias">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Las categorias son las secciones de la tienda. Se crean, editan
                y eliminan desde{' '}
                <Link
                  href={adminRoutes.sections}
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  Secciones de tienda
                </Link>
                .
              </p>
              <ul className="mt-3 space-y-2">
                {categories.map((category) => (
                  <li
                    key={category.slug}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {category.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      /{category.slug}
                    </span>
                  </li>
                ))}
              </ul>
            </SettingsSection>

            <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
              <Button type="submit" disabled={isSaving} className="w-full">
                {isSaving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Guardar cambios
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Guardado simulado: sin backend todavia.
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card/40 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function SettingField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-2">
        {label}
      </Label>
      {children}
      {hint && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background/40 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        className="mt-0.5 shrink-0"
      />
    </div>
  )
}
