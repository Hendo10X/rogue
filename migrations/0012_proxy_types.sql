-- Proxy orders can now be IPv4, ISP, IPv6 or mobile. Existing rows were all IPv4.
-- Paste into the Neon SQL editor. Safe to run twice.

ALTER TABLE "proxy_order" ADD COLUMN IF NOT EXISTS "proxy_type" text DEFAULT 'ipv4' NOT NULL;
