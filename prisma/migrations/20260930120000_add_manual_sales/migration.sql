-- CreateEnum
CREATE TYPE "SaleChannel" AS ENUM ('ONLINE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('WOMPI', 'CASH', 'TRANSFER', 'OTHER');

-- AlterTable
-- Los pedidos existentes son todos de la tienda en linea: quedan como
-- ONLINE / WOMPI gracias a los valores por defecto.
ALTER TABLE "orders" ADD COLUMN     "channel" "SaleChannel" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'WOMPI';

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotencyKey_key" ON "orders"("idempotencyKey");

-- CreateIndex
CREATE INDEX "orders_paymentStatus_paidAt_idx" ON "orders"("paymentStatus", "paidAt");
