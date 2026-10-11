-- Fechas especiales: temporadas que cambian el aspecto de la tienda publica.

-- CreateTable
CREATE TABLE "special_dates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "special_dates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "special_dates_slug_key" ON "special_dates"("slug");

-- Primera temporada. Nace desactivada: la tienda no cambia hasta que se active
-- desde el panel.
INSERT INTO "special_dates" ("id", "slug", "name", "isActive", "updatedAt")
VALUES ('special_date_navidad', 'navidad', 'Navidad', false, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
