-- Plantilla predeterminada de la cinta marquesina. Vive en su propia columna
-- para que guardar un mensaje personalizado nunca la pierda.

-- AlterTable
ALTER TABLE "store_marquee"
ADD COLUMN "defaultText" TEXT NOT NULL DEFAULT 'CALIDAD PREMIUM · ENVÍOS RÁPIDOS · COMPRA SEGURA · TUS DATOS PROTEGIDOS · GARANTÍA · SATISFACCIÓN ASEGURADA';
