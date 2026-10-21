-- Referral program: each user gets a shareable code, and a referrer earns 10%
-- of a referred user's first completed deposit. Apply with `npm run db:push`
-- or paste into the Neon SQL editor. Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "referral_code" (
  "user_id" text PRIMARY KEY NOT NULL,
  "code" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "referral_code_code_unique" UNIQUE("code")
);

DO $$ BEGIN
  ALTER TABLE "referral_code"
    ADD CONSTRAINT "referral_code_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "referral" (
  "id" text PRIMARY KEY NOT NULL,
  "referrer_id" text NOT NULL,
  "referred_id" text NOT NULL,
  "code" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "reward_amount" numeric(18, 2),
  "deposit_id" text,
  "ip_address" text,
  "user_agent" text,
  "flag_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "rewarded_at" timestamp,
  CONSTRAINT "referral_referred_id_unique" UNIQUE("referred_id")
);

DO $$ BEGIN
  ALTER TABLE "referral"
    ADD CONSTRAINT "referral_referrer_id_user_id_fk"
    FOREIGN KEY ("referrer_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "referral"
    ADD CONSTRAINT "referral_referred_id_user_id_fk"
    FOREIGN KEY ("referred_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "referral_referrer_idx" ON "referral" ("referrer_id");
CREATE INDEX IF NOT EXISTS "referral_ip_idx" ON "referral" ("ip_address");

-- Default referral reward: 10% (editable in Ozymandias → Referrals).
INSERT INTO "admin_settings" ("key", "value")
VALUES ('referral_percent', '10')
ON CONFLICT ("key") DO NOTHING;
