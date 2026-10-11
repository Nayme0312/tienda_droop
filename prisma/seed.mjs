import { createPrismaClient } from './client.mjs'
import { printPasswordOnce, upsertAdmin } from './admin-account.mjs'

/**
 * Seed de la base de datos de STREETVIBE.
 *
 * Es idempotente y NO DESTRUCTIVO:
 *  - Si un producto ya existe, solo se rellenan los campos de presentacion
 *    (tallas, colores, etiqueta y ficha tecnica). Nunca se sobreescriben
 *    nombre, descripcion, precio, stock, estado ni imagenes, porque eso
 *    borraria lo que se haya editado desde el panel.
 *  - Si no existe, se crea completo.
 *
 * Aqui vive el catalogo completo que antes estaba duplicado en el archivo
 * estatico lib/products.ts. Ahora la base de datos es la unica fuente y la
 * tienda publica lee de ella.
 *
 * Ejecutar con:  npm run db:seed
 */
const prisma = createPrismaClient()

const CATEGORIES = [
  { name: 'Camisas', slug: 'camisas' },
  { name: 'Gorras', slug: 'gorras' },
  { name: 'Pines', slug: 'pines' },
]

const SHIRT_SIZES = ['S', 'M', 'L', 'XL']
const DELIVERY = '3-5 dias habiles'

const PRODUCTS = [
  {
    slug: 'camisa-chaos',
    name: 'Camisa Chaos',
    description:
      'Camisa streetwear con estampado bold CHAOS. Corte oversize en algodon premium de 220g, estampado DTF de alta durabilidad.',
    price: 89900,
    oldPrice: 109900,
    category: 'camisas',
    stock: 12,
    status: 'ACTIVE',
    mainImage: '/images/camisa-chaos.jpg',
    images: ['/images/camisa-chaos-atras.png'],
    sizes: SHIRT_SIZES,
    colors: ['Negro'],
    badge: 'Popular',
    details: {
      Gramaje: '220g',
      'Tipo de tela': 'Algodon premium',
      Fit: 'Oversize',
      Estampado: 'DTF premium',
      Material: '100% Algodon',
      'Tiempo de entrega': DELIVERY,
    },
    createdAt: '2026-09-18T14:30:00.000Z',
  },
  {
    slug: 'camisa-tokyo',
    name: 'Camisa Tokyo',
    description:
      'Inspiracion oriental con kanji minimalista. Algodon peinado de 210g, fit regular. Edicion limitada.',
    price: 99900,
    oldPrice: null,
    category: 'camisas',
    stock: 14,
    status: 'ACTIVE',
    mainImage: '/images/camisa-tokyo.jpg',
    images: [],
    sizes: SHIRT_SIZES,
    colors: ['Navy'],
    badge: 'Exclusivo',
    details: {
      Gramaje: '210g',
      'Tipo de tela': 'Algodon peinado',
      Fit: 'Regular',
      Estampado: 'Screen',
      Material: '100% Algodon',
      'Tiempo de entrega': DELIVERY,
    },
    createdAt: '2026-09-14T11:05:00.000Z',
  },
  {
    slug: 'camisa-freedom',
    name: 'Camisa Freedom',
    description:
      'Estampado grafico de alas en algodon premium 220g. Fit oversize, estampado DTF premium.',
    price: 94900,
    oldPrice: null,
    category: 'camisas',
    stock: 0,
    status: 'ACTIVE',
    mainImage: '/images/camisa-freedom.jpg',
    images: [],
    sizes: SHIRT_SIZES,
    colors: ['Negro'],
    badge: 'Nuevo',
    details: {
      Gramaje: '220g',
      'Tipo de tela': 'Algodon premium',
      Fit: 'Oversize',
      Estampado: 'DTF premium',
      Material: '100% Algodon',
      'Tiempo de entrega': DELIVERY,
    },
    createdAt: '2026-09-09T16:45:00.000Z',
  },
  {
    slug: 'camisa-classic',
    name: 'Camisa Classic',
    description:
      'Diseno minimalista con emblema bordado. Algodon peinado de 200g, fit regular. Disponible en blanco y negro.',
    price: 79900,
    oldPrice: null,
    category: 'camisas',
    stock: 8,
    status: 'ACTIVE',
    mainImage: '/images/camisa-classic.jpg',
    images: [],
    sizes: SHIRT_SIZES,
    colors: ['Blanco', 'Negro'],
    badge: null,
    details: {
      Gramaje: '200g',
      'Tipo de tela': 'Algodon peinado',
      Fit: 'Regular',
      Estampado: 'Bordado',
      Material: '100% Algodon',
      'Tiempo de entrega': DELIVERY,
    },
    createdAt: '2026-08-30T10:20:00.000Z',
  },
  {
    slug: 'camisa-urban',
    name: 'Camisa Urban',
    description:
      'Arte urbano en tela, skull graphic serigrafiado. Retirada temporalmente del catalogo mientras se repone el estampado.',
    price: 89900,
    oldPrice: 99900,
    category: 'camisas',
    stock: 5,
    status: 'INACTIVE',
    mainImage: '/images/camisa-urban.jpg',
    images: [],
    sizes: SHIRT_SIZES,
    colors: ['Negro'],
    badge: null,
    details: {
      Gramaje: '220g',
      'Tipo de tela': 'Algodon premium',
      Fit: 'Oversize',
      Estampado: 'Screen',
      Material: '100% Algodon',
      'Tiempo de entrega': DELIVERY,
    },
    createdAt: '2026-08-21T13:10:00.000Z',
  },
  {
    slug: 'camisa-vintage',
    name: 'Camisa Vintage',
    description:
      'Look retro con acabado distressed. Algodon lavado de 200g, fit oversize. El estilo nunca pasa de moda.',
    price: 84900,
    oldPrice: null,
    category: 'camisas',
    stock: 10,
    status: 'ACTIVE',
    mainImage: '/images/camisa-vintage.jpg',
    images: [],
    sizes: SHIRT_SIZES,
    colors: ['Gris'],
    badge: null,
    details: {
      Gramaje: '200g',
      'Tipo de tela': 'Algodon lavado',
      Fit: 'Oversize',
      Estampado: 'DTF vintage',
      Material: '100% Algodon',
      'Tiempo de entrega': DELIVERY,
    },
    createdAt: '2026-08-26T09:40:00.000Z',
  },
  {
    slug: 'gorra-la',
    name: 'Gorra LA',
    description:
      'Snapback clasica con bordado LA. Ajustable con broche trasero, circunferencia 56-62 cm.',
    price: 69900,
    oldPrice: null,
    category: 'gorras',
    stock: 21,
    status: 'ACTIVE',
    mainImage: '/images/gorra-la.jpg',
    images: [],
    sizes: [],
    colors: ['Negro'],
    badge: 'Popular',
    details: {
      Tipo: 'Snapback',
      Ajustable: 'Si - broche trasero',
      Acabado: 'Bordada',
      Material: 'Algodon y poliester',
      Circunferencia: '56-62 cm',
      Estilo: 'Urbano / Streetwear',
    },
    createdAt: '2026-09-24T09:00:00.000Z',
  },
  {
    slug: 'gorra-ny',
    name: 'Gorra NY',
    description:
      'Fitted cap con logo NY bordado en color beige. Ajustable con hebilla metalica.',
    price: 69900,
    oldPrice: 84900,
    category: 'gorras',
    stock: 0,
    status: 'ACTIVE',
    mainImage: '/images/gorra-ny.jpg',
    images: [],
    sizes: [],
    colors: ['Beige'],
    badge: 'Nuevo',
    details: {
      Tipo: 'Fitted',
      Ajustable: 'Si - hebilla',
      Acabado: 'Bordada',
      Material: 'Algodon y poliester',
      Circunferencia: '56-62 cm',
      Estilo: 'Urbano / Streetwear',
    },
    createdAt: '2026-09-11T12:30:00.000Z',
  },
  {
    slug: 'gorra-style',
    name: 'Gorra Style',
    description:
      'Diseno exclusivo con bordado NY y detalles unicos. Curved con ajuste de velcro.',
    price: 69900,
    oldPrice: null,
    category: 'gorras',
    stock: 15,
    status: 'ACTIVE',
    mainImage: '/images/gorra-style.jpg',
    images: [],
    sizes: [],
    colors: ['Negro'],
    badge: null,
    details: {
      Tipo: 'Curved',
      Ajustable: 'Si - velcro',
      Acabado: 'Bordada',
      Material: 'Algodon premium',
      Circunferencia: '55-61 cm',
      Estilo: 'Urbano / Streetwear',
    },
    createdAt: '2026-09-02T10:15:00.000Z',
  },
  {
    slug: 'gorra-classic',
    name: 'Gorra Classic',
    description:
      'Minimalismo en su maxima expresion. Fitted en algodon peinado para el dia a dia.',
    price: 64900,
    oldPrice: null,
    category: 'gorras',
    stock: 12,
    status: 'ACTIVE',
    mainImage: '/images/gorra-classic.jpg',
    images: [],
    sizes: [],
    colors: ['Navy'],
    badge: null,
    details: {
      Tipo: 'Fitted',
      Ajustable: 'Si - velcro',
      Acabado: 'Bordada',
      Material: 'Algodon peinado',
      Circunferencia: '55-60 cm',
      Estilo: 'Casual / Urbano',
    },
    createdAt: '2026-08-19T11:50:00.000Z',
  },
  {
    slug: 'gorra-urban',
    name: 'Gorra Urban',
    description:
      'Flat brim con actitud urbana. Snapback para quienes marcan tendencia.',
    price: 74900,
    oldPrice: null,
    category: 'gorras',
    stock: 7,
    status: 'ACTIVE',
    mainImage: '/images/gorra-urban.jpg',
    images: [],
    sizes: [],
    colors: ['Negro'],
    badge: null,
    details: {
      Tipo: 'Snapback flat brim',
      Ajustable: 'Si - broche trasero',
      Acabado: 'Bordada',
      Material: 'Algodon y poliester',
      Circunferencia: '56-62 cm',
      Estilo: 'Urbano / Hip-Hop',
    },
    createdAt: '2026-09-07T15:20:00.000Z',
  },
  {
    slug: 'gorra-retro',
    name: 'Gorra Retro',
    description:
      'Trucker de malla con frontal estampado. Estilo vintage, ajuste con broche plastico.',
    price: 64900,
    oldPrice: null,
    category: 'gorras',
    stock: 9,
    status: 'INACTIVE',
    mainImage: '/images/gorra-retro.jpg',
    images: [],
    sizes: [],
    colors: ['Blanco/Rojo'],
    badge: null,
    details: {
      Tipo: 'Trucker mesh',
      Ajustable: 'Si - broche plastico',
      Acabado: 'Estampada',
      Material: 'Algodon frontal / Malla trasera',
      Circunferencia: '55-62 cm',
      Estilo: 'Retro / Casual',
    },
    createdAt: '2026-08-15T08:50:00.000Z',
  },
  {
    slug: 'pin-butterfly',
    name: 'Pin Butterfly',
    description:
      'Pin de mariposa con esmalte a color, 3.2 x 2.6 cm. Broche de mariposa, aleacion de zinc.',
    price: 29900,
    oldPrice: 34900,
    category: 'pines',
    stock: 33,
    status: 'ACTIVE',
    // Los pines todavia no tienen foto propia (pendiente de la etapa 3).
    mainImage: '/placeholder.svg',
    images: [],
    sizes: [],
    colors: ['Multicolor'],
    badge: 'Nuevo',
    details: {
      Tipo: 'Pin metalico',
      Sujecion: 'Broche mariposa',
      Acabado: 'Esmalte a color',
      Material: 'Aleacion de zinc',
      Medidas: '3.2 x 2.6 cm',
      Estilo: 'Urbano / Streetwear',
    },
    createdAt: '2026-09-26T10:40:00.000Z',
  },
  {
    slug: 'pin-calavera',
    name: 'Pin Calavera',
    description:
      'Pin metalico de calavera con acabado esmaltado plata, 3 x 2.5 cm. Ideal para personalizar gorras.',
    price: 24900,
    oldPrice: null,
    category: 'pines',
    stock: 0,
    status: 'ACTIVE',
    mainImage: '/placeholder.svg',
    images: [],
    sizes: [],
    colors: ['Plata'],
    badge: 'Popular',
    details: {
      Tipo: 'Pin metalico',
      Sujecion: 'Broche mariposa',
      Acabado: 'Esmaltado',
      Material: 'Aleacion de zinc',
      Medidas: '3 x 2.5 cm',
      Estilo: 'Urbano / Streetwear',
    },
    createdAt: '2026-09-05T15:00:00.000Z',
  },
  {
    slug: 'pin-angel',
    name: 'Pin Angel',
    description:
      'Pin de angel con acabado esmaltado suave. Personaliza tu gorra con un toque simbolico.',
    price: 22900,
    oldPrice: null,
    category: 'pines',
    stock: 18,
    status: 'ACTIVE',
    mainImage: '/placeholder.svg',
    images: [],
    sizes: [],
    colors: ['Dorado'],
    badge: null,
    details: {
      Tipo: 'Pin metalico',
      Sujecion: 'Broche mariposa',
      Acabado: 'Esmaltado suave',
      Material: 'Aleacion de zinc',
      Medidas: '2.8 x 2.8 cm',
      Estilo: 'Urbano / Minimalista',
    },
    createdAt: '2026-09-16T13:10:00.000Z',
  },
]

function imageRows(product) {
  return [
    { url: product.mainImage, alt: product.name, isPrimary: true, sortOrder: 0 },
    ...product.images.map((url, index) => ({
      url,
      alt: product.name,
      isPrimary: false,
      sortOrder: index + 1,
    })),
  ]
}

async function seedCategories() {
  const bySlug = new Map()

  for (const category of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    })
    bySlug.set(row.slug, row.id)
  }

  console.log(`  Categorias: ${bySlug.size} (${CATEGORIES.map((c) => c.slug).join(', ')})`)
  return bySlug
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL
  if (!email) {
    console.log(
      '  Administrador: OMITIDO (define ADMIN_EMAIL en .env para crearlo)',
    )
    return
  }

  const { created, plainPassword } = await upsertAdmin(prisma, {
    email,
    name: process.env.ADMIN_NAME,
    password: process.env.ADMIN_PASSWORD,
  })

  if (created) {
    console.log(`  Administrador: creado (${email})`)
    if (plainPassword) printPasswordOnce(email, plainPassword)
  } else {
    console.log(`  Administrador: ya existia, sin cambios (${email})`)
  }
}

async function seedProducts(categoryIdBySlug) {
  let created = 0
  let filled = 0
  let untouched = 0

  for (const product of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(product.category)
    if (!categoryId) {
      throw new Error(`Categoria desconocida en el seed: ${product.category}`)
    }

    const existing = await prisma.product.findUnique({
      where: { slug: product.slug },
      select: { id: true, sizes: true, colors: true, badge: true, details: true },
    })

    if (existing) {
      // Solo se rellenan los campos de presentacion, y solo si estan vacios.
      // Precio, stock, estado, nombre, descripcion e imagenes NO se tocan:
      // pueden haberse editado desde el panel.
      const patch = {}
      if (existing.sizes.length === 0 && product.sizes.length > 0) {
        patch.sizes = product.sizes
      }
      if (existing.colors.length === 0 && product.colors.length > 0) {
        patch.colors = product.colors
      }
      if (existing.badge === null && product.badge) {
        patch.badge = product.badge
      }
      const currentDetails = existing.details ?? {}
      if (Object.keys(currentDetails).length === 0) {
        patch.details = product.details
      }

      if (Object.keys(patch).length > 0) {
        await prisma.product.update({ where: { id: existing.id }, data: patch })
        filled += 1
      } else {
        untouched += 1
      }
      continue
    }

    await prisma.product.create({
      data: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        price: product.price,
        oldPrice: product.oldPrice,
        stock: product.stock,
        status: product.status,
        categoryId,
        sizes: product.sizes,
        colors: product.colors,
        badge: product.badge,
        details: product.details,
        createdAt: new Date(product.createdAt),
        images: { create: imageRows(product) },
      },
    })
    created += 1
  }

  console.log(
    `  Productos: ${created} creados, ${filled} completados, ${untouched} sin cambios`,
  )
}

async function main() {
  console.log('\nSembrando la base de datos de STREETVIBE...\n')

  const categoryIdBySlug = await seedCategories()
  await seedProducts(categoryIdBySlug)
  await seedAdmin()

  console.log('\nSeed completado.\n')
}

main()
  .catch((error) => {
    console.error('\nEl seed ha fallado:', error.message ?? error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
