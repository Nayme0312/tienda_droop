export type ProductCategory = "camisas" | "gorras" | "pines"

export const categoryLabels: Record<ProductCategory, string> = {
  camisas: "Camisas",
  gorras: "Gorras",
  pines: "Pines",
}

export interface Product {
  id: string
  name: string
  price: number
  category: ProductCategory
  image: string
  images: string[]
  description: string
  sizes?: string[]
  colors?: string[]
  details: Record<string, string>
  badge?: string
}

export const products: Product[] = [
  // CAMISAS
{
  id: "camisa-chaos",
  name: "Camisa Chaos",
  price: 25,
  category: "camisas",
  image: "/images/camisa-chaos.jpg",
  images: [
    "/images/camisa-chaos.jpg",
    "/images/camisa-chaos-atras.png",
  ],
  description:
    "Camisa streetwear con estampado bold CHAOS. Perfecta para los que no siguen reglas.",
  sizes: ["S", "M", "L", "XL"],
  colors: ["Negro"],
  badge: "Popular",
  details: {
    Gramaje: "220g",
    "Tipo de tela": "Algodon premium",
    Fit: "Oversize",
    Estampado: "DTF premium",
    Material: "100% Algodon",
    "Tiempo de entrega": "3-5 dias habiles",
  },
},
  {
    id: "camisa-classic",
    name: "Camisa Classic",
    price: 22,
    category: "camisas",
    image: "/images/camisa-classic.jpg",
    images: ["/images/camisa-classic.jpg"],
    description:
      "Diseno minimalista con emblema bordado. Elegancia urbana en estado puro.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Blanco", "Negro"],
    details: {
      Gramaje: "200g",
      "Tipo de tela": "Algodon peinado",
      Fit: "Regular",
      Estampado: "Bordado",
      Material: "100% Algodon",
      "Tiempo de entrega": "3-5 dias habiles",
    },
  },
  {
    id: "camisa-freedom",
    name: "Camisa Freedom",
    price: 27,
    category: "camisas",
    image: "/images/camisa-freedom.jpg",
    images: ["/images/camisa-freedom.jpg"],
    description:
      "Estampado grafico de alas y libertad. Para quienes vuelan alto.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Negro"],
    badge: "Nuevo",
    details: {
      Gramaje: "220g",
      "Tipo de tela": "Algodon premium",
      Fit: "Oversize",
      Estampado: "DTF premium",
      Material: "100% Algodon",
      "Tiempo de entrega": "3-5 dias habiles",
    },
  },
  {
    id: "camisa-urban",
    name: "Camisa Urban",
    price: 25,
    category: "camisas",
    image: "/images/camisa-urban.jpg",
    images: ["/images/camisa-urban.jpg"],
    description: "Arte urbano en tela. Skull graphic con actitud.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Negro"],
    details: {
      Gramaje: "220g",
      "Tipo de tela": "Algodon premium",
      Fit: "Oversize",
      Estampado: "Screen",
      Material: "100% Algodon",
      "Tiempo de entrega": "3-5 dias habiles",
    },
  },
  {
    id: "camisa-tokyo",
    name: "Camisa Tokyo",
    price: 28,
    category: "camisas",
    image: "/images/camisa-tokyo.jpg",
    images: ["/images/camisa-tokyo.jpg"],
    description: "Inspiracion oriental. Kanji minimista con esencia streetwear.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Navy"],
    badge: "Exclusivo",
    details: {
      Gramaje: "210g",
      "Tipo de tela": "Algodon peinado",
      Fit: "Regular",
      Estampado: "Screen",
      Material: "100% Algodon",
      "Tiempo de entrega": "3-5 dias habiles",
    },
  },
  {
    id: "camisa-vintage",
    name: "Camisa Vintage",
    price: 24,
    category: "camisas",
    image: "/images/camisa-vintage.jpg",
    images: ["/images/camisa-vintage.jpg"],
    description: "Look retro con acabado distressed. El estilo nunca pasa de moda.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Gris"],
    details: {
      Gramaje: "200g",
      "Tipo de tela": "Algodon lavado",
      Fit: "Oversize",
      Estampado: "DTF vintage",
      Material: "100% Algodon",
      "Tiempo de entrega": "3-5 dias habiles",
    },
  },
  // GORRAS
  {
    id: "gorra-la",
    name: "Gorra LA",
    price: 20,
    category: "gorras",
    image: "/images/gorra-la.jpg",
    images: ["/images/gorra-la.jpg"],
    description: "Snapback clasica con bordado LA. El icono del west coast.",
    colors: ["Negro"],
    badge: "Popular",
    details: {
      Tipo: "Snapback",
      Ajustable: "Si - broche trasero",
      Acabado: "Bordada",
      Material: "Algodon y poliester",
      Circunferencia: "56-62 cm",
      Estilo: "Urbano / Streetwear",
    },
  },
  {
    id: "gorra-style",
    name: "Gorra Style",
    price: 20,
    category: "gorras",
    image: "/images/gorra-style.jpg",
    images: ["/images/gorra-style.jpg"],
    description: "Diseno exclusivo con bordado NY y detalles unicos.",
    colors: ["Negro"],
    details: {
      Tipo: "Curved",
      Ajustable: "Si - velcro",
      Acabado: "Bordada",
      Material: "Algodon premium",
      Circunferencia: "55-61 cm",
      Estilo: "Urbano / Streetwear",
    },
  },
  {
    id: "gorra-ny",
    name: "Gorra NY",
    price: 20,
    category: "gorras",
    image: "/images/gorra-ny.jpg",
    images: ["/images/gorra-ny.jpg"],
    description: "Fitted cap con logo NY bordado. Estilo east coast autentico.",
    colors: ["Beige"],
    badge: "Nuevo",
    details: {
      Tipo: "Fitted",
      Ajustable: "Si - hebilla",
      Acabado: "Bordada",
      Material: "Algodon y poliester",
      Circunferencia: "56-62 cm",
      Estilo: "Urbano / Streetwear",
    },
  },
  {
    id: "gorra-classic",
    name: "Gorra Classic",
    price: 18,
    category: "gorras",
    image: "/images/gorra-classic.jpg",
    images: ["/images/gorra-classic.jpg"],
    description: "Minimalismo en su maxima expresion. Para el dia a dia.",
    colors: ["Navy"],
    details: {
      Tipo: "Fitted",
      Ajustable: "Si - velcro",
      Acabado: "Bordada",
      Material: "Algodon peinado",
      Circunferencia: "55-60 cm",
      Estilo: "Casual / Urbano",
    },
  },
  {
    id: "gorra-urban",
    name: "Gorra Urban",
    price: 22,
    category: "gorras",
    image: "/images/gorra-urban.jpg",
    images: ["/images/gorra-urban.jpg"],
    description: "Flat brim con actitud urbana. Para quienes marcan tendencia.",
    colors: ["Negro"],
    details: {
      Tipo: "Snapback flat brim",
      Ajustable: "Si - broche trasero",
      Acabado: "Bordada",
      Material: "Algodon y poliester",
      Circunferencia: "56-62 cm",
      Estilo: "Urbano / Hip-Hop",
    },
  },
  {
    id: "gorra-retro",
    name: "Gorra Retro",
    price: 19,
    category: "gorras",
    image: "/images/gorra-retro.jpg",
    images: ["/images/gorra-retro.jpg"],
    description: "Trucker mesh con sabor vintage. Old school meets new school.",
    colors: ["Blanco/Rojo"],
    details: {
      Tipo: "Trucker mesh",
      Ajustable: "Si - broche plastico",
      Acabado: "Estampada",
      Material: "Algodon frontal / Malla trasera",
      Circunferencia: "55-62 cm",
      Estilo: "Retro / Casual",
    },
  },
  // PINES
  // TODO: reemplazar /placeholder.svg por /images/pin-*.jpg cuando existan las fotos reales
  {
    id: "pin-calavera",
    name: "Pin Calavera",
    price: 8,
    category: "pines",
    image: "/placeholder.svg",
    images: ["/placeholder.svg"],
    description:
      "Pin metalico de calavera para darle actitud a tu gorra. Pequeno detalle, gran statement.",
    colors: ["Plata"],
    badge: "Popular",
    details: {
      Tipo: "Pin metalico",
      Sujecion: "Broche mariposa",
      Acabado: "Esmaltado",
      Material: "Aleacion de zinc",
      Medidas: "3 x 2.5 cm",
      Estilo: "Urbano / Streetwear",
    },
  },
  {
    id: "pin-angel",
    name: "Pin Angel",
    price: 7,
    category: "pines",
    image: "/placeholder.svg",
    images: ["/placeholder.svg"],
    description:
      "Pin de angel con acabado esmaltado. Personaliza tu gorra con un toque simbolico.",
    colors: ["Dorado"],
    details: {
      Tipo: "Pin metalico",
      Sujecion: "Broche mariposa",
      Acabado: "Esmaltado suave",
      Material: "Aleacion de zinc",
      Medidas: "2.8 x 2.8 cm",
      Estilo: "Urbano / Minimalista",
    },
  },
  {
    id: "pin-butterfly",
    name: "Pin Butterfly",
    price: 9,
    category: "pines",
    image: "/placeholder.svg",
    images: ["/placeholder.svg"],
    description:
      "Pin de mariposa con esmalte a color. El accesorio ideal para romper el look monocromatico.",
    colors: ["Multicolor"],
    badge: "Nuevo",
    details: {
      Tipo: "Pin metalico",
      Sujecion: "Broche mariposa",
      Acabado: "Esmalte a color",
      Material: "Aleacion de zinc",
      Medidas: "3.2 x 2.6 cm",
      Estilo: "Urbano / Streetwear",
    },
  },
]

export function getProductsByCategory(category: ProductCategory): Product[] {
  return products.filter((p) => p.category === category)
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}