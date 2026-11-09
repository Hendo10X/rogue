-- Telegram bot is members-only: someone who has messaged the bot but not yet
-- connected their Rogue Socials account has no user. Run after 0014.
-- Paste into the Neon SQL editor; safe to run twice.

ALTER TABLE "telegram_account" ALTER COLUMN "user_id" DROP NOT NULL;
