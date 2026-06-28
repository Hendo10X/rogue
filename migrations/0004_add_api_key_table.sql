-- Rogue public API keys. Apply with `npm run db:push` or paste into the Neon
-- SQL editor. Safe to run multiple times.
CREATE TABLE IF NOT EXISTS "api_key" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "key_hash" text NOT NULL,
  "key_prefix" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "last_used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "api_key_key_hash_unique" UNIQUE("key_hash")
);

DO $$ BEGIN
  ALTER TABLE "api_key"
    ADD CONSTRAINT "api_key_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "api_key_user_idx" ON "api_key" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "api_key_hash_idx" ON "api_key" ("key_hash");
