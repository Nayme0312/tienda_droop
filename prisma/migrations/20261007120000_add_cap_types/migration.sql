-- Tipos de gorra administrables y su asignacion a los productos de gorras.

-- CreateTable
CREATE TABLE "cap_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cap_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cap_types_slug_key" ON "cap_types"("slug");

-- AlterTable
ALTER TABLE "products" ADD COLUMN "capTypeId" TEXT;

-- CreateIndex
CREATE INDEX "products_capTypeId_idx" ON "products"("capTypeId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_capTypeId_fkey" FOREIGN KEY ("capTypeId") REFERENCES "cap_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tipos iniciales. A partir de aqui se administran desde el panel.
INSERT INTO "cap_types" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
VALUES
    ('captype_beisbolera', 'Beisbolera', 'beisbolera', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('captype_cerrada', 'Cerrada', 'cerrada', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
