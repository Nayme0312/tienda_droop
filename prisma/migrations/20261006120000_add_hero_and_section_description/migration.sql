-- Hero administrable y descripcion editable de las secciones de tienda.

-- CreateEnum
CREATE TYPE "HeroMediaType" AS ENUM ('VIDEO', 'IMAGE');

-- CreateTable
CREATE TABLE "hero_settings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "mediaType" "HeroMediaType" NOT NULL DEFAULT 'VIDEO',
    "videoUrl" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_settings_pkey" PRIMARY KEY ("id")
);

-- Fila unica con el video que el Hero mostraba hasta ahora, para que la
-- portada no cambie al aplicar la migracion.
INSERT INTO "hero_settings" ("id", "mediaType", "videoUrl", "imageUrl", "isActive", "updatedAt")
VALUES ('main', 'VIDEO', '/images/videohero1-scroll.mp4', NULL, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
