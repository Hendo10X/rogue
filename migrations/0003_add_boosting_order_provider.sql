ALTER TABLE "boosting_order" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'rss' NOT NULL;
