-- Customers of the Telegram shop bot (each linked to a normal Rogue account).
-- Paste into the Neon SQL editor. Only adds a table; safe to run twice.

CREATE TABLE IF NOT EXISTS "telegram_account" (
  "telegram_id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "chat_id" text NOT NULL,
  "username" text,
  "pending" jsonb,
  "link_code" text,
  "link_code_expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- For connecting a website account (one-time code from the bot).
ALTER TABLE "telegram_account" ADD COLUMN IF NOT EXISTS "link_code" text;
ALTER TABLE "telegram_account" ADD COLUMN IF NOT EXISTS "link_code_expires_at" timestamp;
CREATE UNIQUE INDEX IF NOT EXISTS "telegram_account_link_code_idx" ON "telegram_account" ("link_code");

DO $$ BEGIN
  ALTER TABLE "telegram_account"
    ADD CONSTRAINT "telegram_account_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_account_user_idx" ON "telegram_account" ("user_id");
