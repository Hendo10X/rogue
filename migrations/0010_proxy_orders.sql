-- Dedicated IPv4 proxies sold through Tools → Proxies (supplier: proxy-seller).
-- Paste into the Neon SQL editor. Only adds a table; safe to run twice.

CREATE TABLE IF NOT EXISTS "proxy_order" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "wallet_id" text,
  "provider_order_id" text,
  "country" text NOT NULL,
  "period" text NOT NULL,
  "quantity" integer NOT NULL,
  "amount" numeric(18, 2) NOT NULL,
  "cost_usd" numeric(18, 2),
  "status" text DEFAULT 'processing' NOT NULL,
  "proxies" jsonb,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "proxy_order"
    ADD CONSTRAINT "proxy_order_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "proxy_order_user_idx" ON "proxy_order" ("user_id");
