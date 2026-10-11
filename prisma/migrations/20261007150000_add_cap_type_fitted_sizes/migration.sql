-- Tipos de gorra que se venden por talla cerrada (activan la Guia de tallas).

-- AlterTable
ALTER TABLE "cap_types" ADD COLUMN "usesFittedSizes" BOOLEAN NOT NULL DEFAULT false;

-- La gorra cerrada es la que usa tallas; la beisbolera es ajustable.
UPDATE "cap_types" SET "usesFittedSizes" = true WHERE "slug" = 'cerrada';
