-- 1) Customer log requests (Tools → Request a log).
-- 2) Tutorials (instructions + video links) shown on /tutorials.
-- Paste into the Neon SQL editor. Only adds tables; safe to run twice.

CREATE TABLE IF NOT EXISTS "log_request" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "platform" text NOT NULL,
  "details" text NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "budget_ngn" numeric(18, 2),
  "status" text DEFAULT 'open' NOT NULL,
  "admin_note" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "log_request"
    ADD CONSTRAINT "log_request_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "log_request_user_idx" ON "log_request" ("user_id");
CREATE INDEX IF NOT EXISTS "log_request_status_idx" ON "log_request" ("status");

CREATE TABLE IF NOT EXISTS "tutorial" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "topic" text DEFAULT 'General' NOT NULL,
  "body" text DEFAULT '' NOT NULL,
  "video_url" text,
  "published" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
