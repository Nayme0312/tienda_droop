-- Testimonios de clientes administrables desde el panel. Crea una tabla
-- nueva y copia en ella los tres testimonios que hasta ahora estaban fijos en
-- components/testimonials-section.tsx, para que la portada no quede vacia.
-- No modifica ningun dato existente.

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "productName" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id"),
    -- La API ya lo valida; esto impide que un dato fuera de rango entre por otra via.
    CONSTRAINT "testimonials_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

-- CreateIndex
CREATE INDEX "testimonials_isActive_reviewedAt_idx" ON "testimonials"("isActive", "reviewedAt");

-- Testimonios iniciales (los que mostraba la portada).
INSERT INTO "testimonials" ("id", "customerName", "rating", "comment", "productName", "reviewedAt", "updatedAt") VALUES
  ('testimonial_seed_carlos', 'Carlos M.', 5, 'La calidad de las camisas es increible. El estampado no se desvanece y la tela es muy comoda. 100% recomendado.', 'Camisa Chaos', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP),
  ('testimonial_seed_sofia', 'Sofia R.', 5, 'Las gorras son de primera. El bordado es impecable y se nota que es un producto premium. Ya tengo 3.', 'Gorra LA', CURRENT_TIMESTAMP - INTERVAL '1 month', CURRENT_TIMESTAMP),
  ('testimonial_seed_diego', 'Diego L.', 5, 'El envio fue super rapido y el empaque muy cuidado. La camisa oversize me quedo perfecta. Volvere a comprar.', 'Camisa Freedom', CURRENT_TIMESTAMP - INTERVAL '2 months', CURRENT_TIMESTAMP);
