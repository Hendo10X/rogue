-- Red-dot alerts for log requests: set when an admin answers, cleared when
-- the customer opens their requests. Paste into the Neon SQL editor. Safe to run twice.

ALTER TABLE "log_request" ADD COLUMN IF NOT EXISTS "customer_unread" boolean DEFAULT false NOT NULL;
