ALTER TABLE "deposit" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'plisio' NOT NULL;
