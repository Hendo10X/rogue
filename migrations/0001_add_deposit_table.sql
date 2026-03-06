CREATE TABLE IF NOT EXISTS "deposit" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"wallet_id" text NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"currency" text NOT NULL,
	"plisio_txn_id" text,
	"plisio_order_number" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invoice_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "deposit_plisio_order_number_unique" UNIQUE("plisio_order_number")
);
--> statement-breakpoint
ALTER TABLE "deposit" ADD CONSTRAINT "deposit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit" ADD CONSTRAINT "deposit_wallet_id_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deposit_user_idx" ON "deposit" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deposit_status_idx" ON "deposit" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deposit_plisio_order_idx" ON "deposit" USING btree ("plisio_order_number");
