-- One-time SMS numbers sold through Tools → OTP numbers (supplier: otpking).
-- Paste into the Neon SQL editor. Only adds a table; safe to run twice.

CREATE TABLE IF NOT EXISTS "otp_order" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "wallet_id" text,
  "provider_number_id" text,
  "country" text NOT NULL,
  "app" text NOT NULL,
  "number" text,
  "amount" numeric(18, 2) NOT NULL,
  "cost_usd" numeric(18, 4),
  "status" text DEFAULT 'waiting' NOT NULL,
  "code" text,
  "sms" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "otp_order"
    ADD CONSTRAINT "otp_order_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "otp_order_user_idx" ON "otp_order" ("user_id");
