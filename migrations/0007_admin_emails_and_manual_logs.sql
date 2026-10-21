-- 1) Admins added from Ozymandias → Settings (the owner emails are built in
--    and never stored here).
-- 2) Uploaded logs for manual listings, delivered instantly on purchase.
-- Apply with `npm run db:push` or paste into the Neon SQL editor.
-- Only adds tables; safe to run multiple times.

CREATE TABLE IF NOT EXISTS "admin_email" (
  "email" text PRIMARY KEY NOT NULL,
  "added_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "manual_log_item" (
  "id" text PRIMARY KEY NOT NULL,
  "listing_id" text NOT NULL,
  "content" text NOT NULL,
  "status" text DEFAULT 'available' NOT NULL,
  "order_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "sold_at" timestamp
);

DO $$ BEGIN
  ALTER TABLE "manual_log_item"
    ADD CONSTRAINT "manual_log_item_listing_id_listing_id_fk"
    FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "manual_log_item_listing_status_idx" ON "manual_log_item" ("listing_id", "status");
CREATE INDEX IF NOT EXISTS "manual_log_item_order_idx" ON "manual_log_item" ("order_id");
