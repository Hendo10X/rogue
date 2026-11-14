// Run with `npm run test:money`. The admin hears about an OTP order only once the customer has the code — with the number and code.
import { db } from "@/db/drizzle";
import * as schemaModule from "@/db/schema";
import { otpOrder, transaction, user, wallet } from "@/db/schema";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}`, detail ?? ""); }
}

process.env.TELEGRAM_BOT_TOKEN = "admin-bot";
process.env.TELEGRAM_CHAT_ID = "999";
process.env.GRIZZLY_API_KEY = "test-grizzly";

const admin: string[] = [];
let grizzlyStatus = "STATUS_WAIT_CODE";
globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  if (url.hostname === "api.telegram.org") {
    admin.push(JSON.parse(String(init?.body ?? "{}")).text);
    return new Response(JSON.stringify({ ok: true, result: {} }));
  }
  if (url.hostname.includes("grizzly")) {
    const action = url.searchParams.get("action");
    if (action === "getStatus") return new Response(grizzlyStatus);
    if (action === "setStatus") return new Response("ACCESS_ACTIVATION");
  }
  return new Response("not mocked", { status: 500 });
}) as typeof fetch;

async function main() {
  const { pushSchema } = await import("drizzle-kit/api");
  const { apply } = await pushSchema(schemaModule as Record<string, unknown>, db as never);
  await apply();
  await db.insert(user).values({ id: "u1", name: "Ada", email: "ada@example.com", emailVerified: true });
  await db.insert(wallet).values({ id: "w1", userId: "u1", currency: "NGN", balance: "0" });
  await db.insert(otpOrder).values({
    id: "otp1", userId: "u1", walletId: "w1", providerNumberId: "grizzly:38496653", country: "us", app: "whatsapp",
    number: "12025550123", amount: "1130.00", costUsd: "0.5000",
  } as never);
  await db.insert(transaction).values({
    id: "t1", walletId: "w1", type: "order_payment", amount: "-1130.00", currency: "NGN", status: "completed",
    metadata: { kind: "otp", otpOrderId: "otp1", channel: "bot" },
  } as never);
  const { getOtpOrders } = await import("@/lib/otp/orders");

  console.log("\n1. Number bought, code not here yet");
  await getOtpOrders("u1");
  check("no admin alert while waiting for the code", admin.length === 0, admin);

  console.log("\n2. The code arrives");
  grizzlyStatus = "STATUS_OK:445566";
  const [row] = await getOtpOrders("u1");
  check("order marked received with the code", row.status === "received" && row.code === "445566", row);
  check("exactly one admin alert", admin.length === 1, admin);
  const text = admin[0] ?? "";
  check("alert has the app, country, number and code", text.includes("WhatsApp · United States · +12025550123 · code 445566"), text);
  check("alert has amount and type", text.startsWith("✅ <b>₦1,130</b> · OTP number"), text);
  check("alert says it came from the bot (from the payment record)", text.endsWith("ada@example.com · Telegram bot"), text);

  console.log("\n3. Checking again doesn't alert twice");
  await getOtpOrders("u1");
  check("still one alert", admin.length === 1, admin);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
