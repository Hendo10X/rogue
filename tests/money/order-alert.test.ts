// Run with `npm run test:money`. OTP number and proxy orders post "New Order Received" to the admin Telegram chat.
import { db } from "@/db/drizzle";
import * as schemaModule from "@/db/schema";
import { user } from "@/db/schema";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}`, detail ?? ""); }
}

process.env.TELEGRAM_BOT_TOKEN = "admin-bot";
process.env.TELEGRAM_CHAT_ID = "999";
const sent: { chat_id?: string; text?: string }[] = [];
globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
  if (String(input).includes("api.telegram.org/botadmin-bot/sendMessage")) {
    sent.push(JSON.parse(String(init?.body ?? "{}")));
    return new Response(JSON.stringify({ ok: true, result: {} }));
  }
  return new Response("not mocked", { status: 500 });
}) as typeof fetch;

async function main() {
  const { pushSchema } = await import("drizzle-kit/api");
  const { apply } = await pushSchema(schemaModule as Record<string, unknown>, db as never);
  await apply();
  await db.insert(user).values({ id: "u1", name: "Ada <script>", email: "ada@example.com", emailVerified: true });
  const { alertAdminOfOrder } = await import("@/lib/order-alert");

  console.log("\n1. OTP number bought on the website");
  await alertAdminOfOrder({ userId: "u1", orderId: "abcdef12-3456", orderType: "otp", amountNgn: "1130.00", description: "WhatsApp · United States", channel: "web" });
  const otp = sent.at(-1);
  check("sent to the admin chat", otp?.chat_id === "999", otp);
  check("says New Order Received", /New Order Received/.test(otp?.text ?? ""));
  check("type and description", (otp?.text ?? "").includes("OTP number — WhatsApp · United States"), otp?.text);
  check("amount in naira", (otp?.text ?? "").includes("₦1,130"), otp?.text);
  check("customer name escaped", (otp?.text ?? "").includes("Ada &lt;script&gt;") && !(otp?.text ?? "").includes("<script>"), otp?.text);
  check("no 'Via' line for the website", !(otp?.text ?? "").includes("Via:"), otp?.text);

  console.log("\n2. Proxies bought in the Telegram bot");
  await alertAdminOfOrder({ userId: "u1", orderId: "fedcba98-7654", orderType: "proxy", amountNgn: "9800.00", description: "2 × IPv4 · US · 30 days", channel: "bot" });
  const proxy = sent.at(-1);
  check("type and description", (proxy?.text ?? "").includes("Proxies — 2 × IPv4 · US · 30 days"), proxy?.text);
  check("says it came from the bot", (proxy?.text ?? "").includes("Via:</b> Telegram bot"), proxy?.text);

  console.log("\n3. Never breaks an order");
  globalThis.fetch = (async () => { throw new Error("telegram down"); }) as typeof fetch;
  let threw = false;
  try {
    await alertAdminOfOrder({ userId: "missing", orderId: "x", orderType: "otp", amountNgn: "1", description: "x" });
  } catch { threw = true; }
  check("Telegram down or unknown user doesn't throw", !threw);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
