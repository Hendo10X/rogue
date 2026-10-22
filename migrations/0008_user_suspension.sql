-- Suspended accounts (Ozymandias → Users → Suspend). Kept in its own table so
-- the user table better-auth reads at sign-in is untouched. Apply with
-- `npm run db:push` or paste into the Neon SQL editor. Safe to run twice.

CREATE TABLE IF NOT EXISTS "user_suspension" (
  "user_id" text PRIMARY KEY NOT NULL,
  "reason" text,
  "suspended_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "user_suspension"
    ADD CONSTRAINT "user_suspension_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
