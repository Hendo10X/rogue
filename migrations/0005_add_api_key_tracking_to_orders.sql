-- Attribute API purchases to the reseller key that placed them, and record the
-- API markup % actually charged. Apply with `npm run db:push` or paste into the
-- Neon SQL editor. Safe to run multiple times.

-- --- Marketplace ("logs") orders ---------------------------------------------
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "api_key_id" text;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "applied_markup_percent" numeric;

DO $$ BEGIN
  ALTER TABLE "order"
    ADD CONSTRAINT "order_api_key_id_api_key_id_fk"
    FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "order_api_key_idx" ON "order" ("api_key_id");

-- --- Boosting orders ---------------------------------------------------------
ALTER TABLE "boosting_order" ADD COLUMN IF NOT EXISTS "api_key_id" text;
ALTER TABLE "boosting_order" ADD COLUMN IF NOT EXISTS "applied_markup_percent" numeric;

DO $$ BEGIN
  ALTER TABLE "boosting_order"
    ADD CONSTRAINT "boosting_order_api_key_id_api_key_id_fk"
    FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "boosting_order_api_key_idx" ON "boosting_order" ("api_key_id");
