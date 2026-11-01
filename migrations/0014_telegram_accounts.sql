-- Customers of the Telegram shop bot (each linked to a normal Rogue account).
-- Paste into the Neon SQL editor. Only adds a table; safe to run twice.

CREATE TABLE IF NOT EXISTS "telegram_account" (
  "telegram_id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "chat_id" text NOT NULL,
  "username" text,
  "pending" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "telegram_account"
    ADD CONSTRAINT "telegram_account_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_account_user_idx" ON "telegram_account" ("user_id");
