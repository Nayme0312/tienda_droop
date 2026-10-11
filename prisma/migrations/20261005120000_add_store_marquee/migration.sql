-- Cinta marquesina de la portada, administrable desde el panel.

-- CreateTable
CREATE TABLE "store_marquee" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "text" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_marquee_pkey" PRIMARY KEY ("id")
);

-- Fila unica con los mismos beneficios que mostraba la cinta hasta ahora, para
-- que la tienda no cambie al aplicar la migracion.
INSERT INTO "store_marquee" ("id", "text", "isActive", "updatedAt")
VALUES (
    'main',
    'Calidad Premium · Materiales de alta calidad · Envíos Rápidos · A todo el país · Compra Segura · Tus datos protegidos · Garantía · Satisfacción asegurada',
    true,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
