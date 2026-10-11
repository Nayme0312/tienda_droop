-- Productos destacados en la portada (estrella del panel). Solo anade
-- columnas: los productos existentes quedan sin destacar y no se modifica
-- ningun otro dato.

-- AlterTable
ALTER TABLE "products" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "featuredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "products_isFeatured_idx" ON "products"("isFeatured");
