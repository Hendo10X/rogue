-- Add supplier columns
ALTER TABLE "supplier" ADD COLUMN IF NOT EXISTS "api_url" text DEFAULT '';
ALTER TABLE "supplier" ADD COLUMN IF NOT EXISTS "api_key" text DEFAULT '';

-- Add listing columns
ALTER TABLE "listing" ADD COLUMN IF NOT EXISTS "external_product_id" text;
ALTER TABLE "listing" ADD COLUMN IF NOT EXISTS "supplier_price" numeric(18, 8);
ALTER TABLE "listing" ADD COLUMN IF NOT EXISTS "category_name" text;

-- Backfill for existing rows
UPDATE "listing" SET "external_product_id" = "id" WHERE "external_product_id" IS NULL;
UPDATE "listing" SET "supplier_price" = COALESCE("price", 0) WHERE "supplier_price" IS NULL;

-- Set NOT NULL after backfill
ALTER TABLE "listing" ALTER COLUMN "external_product_id" SET NOT NULL;
ALTER TABLE "listing" ALTER COLUMN "supplier_price" SET NOT NULL;

-- Unique index
CREATE UNIQUE INDEX IF NOT EXISTS "listing_supplier_product_idx" ON "listing" ("supplier_id", "external_product_id");
