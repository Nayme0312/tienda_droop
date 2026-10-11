-- Codigo numerico unico de producto (1000, 1001, 1002...).
--
-- Lo genera PostgreSQL con una secuencia: dos productos creados a la vez nunca
-- reciben el mismo numero, y un codigo usado no se vuelve a entregar aunque el
-- producto se elimine.

-- CreateSequence
CREATE SEQUENCE "products_code_seq" AS INTEGER START WITH 1000 MINVALUE 1000;

-- AlterTable
ALTER TABLE "products" ADD COLUMN "code" INTEGER;

-- Productos que ya existian: codigos consecutivos desde 1000, del mas antiguo
-- al mas reciente. No se toca ninguna otra columna.
UPDATE "products" AS p
SET "code" = numbered.code
FROM (
    SELECT "id", 999 + ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS code
    FROM "products"
    WHERE "code" IS NULL
) AS numbered
WHERE p."id" = numbered."id";

-- La secuencia continua despues del ultimo codigo asignado (o entrega 1000 si
-- la tabla estaba vacia).
SELECT setval(
    '"products_code_seq"',
    COALESCE((SELECT MAX("code") FROM "products"), 1000),
    EXISTS (SELECT 1 FROM "products")
);

ALTER TABLE "products" ALTER COLUMN "code" SET DEFAULT nextval('"products_code_seq"');
ALTER TABLE "products" ALTER COLUMN "code" SET NOT NULL;
ALTER SEQUENCE "products_code_seq" OWNED BY "products"."code";

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");
