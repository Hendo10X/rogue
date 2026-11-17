// Run with `npm run test:money`. The admin gets one short line per completed deposit — never for unpaid ones, never twice.
import { db } from "@/db/drizzle";
import * as schemaModule from "@/db/schema";
import { deposit, user, wallet } from "@/db/schema";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}`, detail ?? ""); }
}

process.env.TELEGRAM_BOT_TOKEN = "admin-bot";
process.env.TELEGRAM_CHAT_ID = "999";
process.env.FLUTTERWAVE_SECRET_KEY = "test-flw";

const admin: string[] = [];
let flwStatus = "pending";
globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  if (url.hostname === "api.telegram.org") {
    const body = JSON.parse(String(init?.body ?? "{}"));
    if (body.chat_id === "999") admin.push(body.text);
    return new Response(JSON.stringify({ ok: true, result: {} }));
  }
  if (url.hostname === "api.flutterwave.com") {
    return new Response(JSON.stringify({ status: "success", data: { id: 777, tx_ref: "flw-ref-1", amount: 5000, currency: "NGN", status: flwStatus } }));
  }
  return new Response("not mocked", { status: 500 });
}) as typeof fetch;

async function main() {
  const { pushSchema } = await import("drizzle-kit/api");
  const { apply } = await pushSchema(schemaModule as Record<string, unknown>, db as never);
  await apply();
  await db.insert(user).values({ id: "u1", name: "Ada <b>", email: "ada@example.com", emailVerified: true });
  await db.insert(wallet).values({ id: "w1", userId: "u1", currency: "NGN", balance: "0" });
  await db.insert(deposit).values({ id: "d1", userId: "u1", walletId: "w1", amount: "5000", currency: "NGN", provider: "flutterwave", plisioOrderNumber: "flw-ref-1" });
  const { adminDepositText } = await import("@/lib/deposit-alert");
  const { creditFlutterwaveDeposit } = await import("@/lib/flutterwave");

  console.log("\n1. One short line");
  const text = adminDepositText({ amountNgn: 5000, provider: "Korapay", userName: "Ada <b>", userEmail: "ada@example.com" });
  check("amount, provider, who — escaped", text === "💰 <b>₦5,000</b> deposit · Korapay · Ada &lt;b&gt; · ada@example.com", text);

  console.log("\n2. Unpaid Flutterwave checkout");
  await creditFlutterwaveDeposit("flw-ref-1", { source: "test" });
  check("no alert before the payment succeeds", admin.length === 0, admin);

  console.log("\n3. Payment succeeds, then the webhook and the browser both check");
  flwStatus = "successful";
  await Promise.all([creditFlutterwaveDeposit("flw-ref-1", { source: "webhook" }), creditFlutterwaveDeposit("flw-ref-1", { source: "browser" })]);
  await creditFlutterwaveDeposit("flw-ref-1", { source: "sweep" });
  check("exactly one admin alert", admin.length === 1, admin);
  check("it's the deposit line", admin[0] === "💰 <b>₦5,000</b> deposit · Flutterwave · Ada &lt;b&gt; · ada@example.com", admin[0]);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
