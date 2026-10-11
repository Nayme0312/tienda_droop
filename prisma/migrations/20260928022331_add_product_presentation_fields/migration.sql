-- AlterTable
ALTER TABLE "products" ADD COLUMN     "badge" TEXT,
ADD COLUMN     "colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "details" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "sizes" TEXT[] DEFAULT ARRAY[]::TEXT[];
