// Run with `npm run test:money`. Admin Telegram alerts: successful orders only, in three short lines.
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
  const { adminOrderText, sendAdminActionNeeded } = await import("@/lib/email");

  console.log("\n1. Short format: amount + type, what was bought, who");
  const logs = adminOrderText({
    orderType: "marketplace",
    product: "POLAND COUNTRY FACEB00K ( 0-50 friend ) NO 2fa",
    platform: "facebook",
    quantity: 2,
    amount: "9000.00",
    currency: "NGN",
    userName: "Ada",
    userEmail: "ada@example.com",
    status: "completed",
    orderId: "abcdef12-3456",
  });
  check("three lines", logs.split("\n").length === 3, logs);
  check("amount and type with quantity", logs.startsWith("✅ <b>₦9,000</b> · Logs × 2"), logs);
  check("the log's title, not just the platform", logs.includes("POLAND COUNTRY FACEB00K"), logs);
  check("no order ID or status clutter", !/Order ID|Status|abcdef12|completed/.test(logs), logs);
  const one = adminOrderText({ orderType: "boosting", serviceName: "IG followers", quantity: 1, amount: "500", currency: "NGN", userName: "A", userEmail: "a@x.com" });
  check("quantity 1 isn't shown", one.startsWith("✅ <b>₦500</b> · Boosting\n"), one);
  const manual = adminOrderText({ orderType: "marketplace", product: "IG aged", quantity: 1, amount: "1000", currency: "NGN", userName: "A", userEmail: "a@x.com", needsDelivery: true });
  check("manual log says to deliver it", manual.endsWith("📦 Deliver it on Ozymandias → Orders"), manual);
  const long = adminOrderText({ orderType: "marketplace", product: "x".repeat(300), amount: "1", currency: "NGN", userName: "A", userEmail: "a@x.com" });
  check("very long titles are cut short", long.split("\n")[1].length <= 120, long.split("\n")[1].length);

  console.log("\n2. OTP number on the website, proxies in the bot");
  await alertAdminOfOrder({ userId: "u1", orderId: "abcdef12-3456", orderType: "otp", amountNgn: "1130.00", description: "WhatsApp · United States", channel: "web" });
  const otp = sent.at(-1);
  check("sent to the admin chat", otp?.chat_id === "999", otp);
  check("OTP alert", (otp?.text ?? "") === "✅ <b>₦1,130</b> · OTP number\nWhatsApp · United States\nAda &lt;script&gt; · ada@example.com", otp?.text);
  await alertAdminOfOrder({ userId: "u1", orderId: "fedcba98-7654", orderType: "proxy", amountNgn: "9800.00", description: "2 × IPv4 · US · 30 days", channel: "bot" });
  const proxy = sent.at(-1);
  check("proxy alert says it came from the bot", (proxy?.text ?? "").endsWith("ada@example.com · Telegram bot") && (proxy?.text ?? "").includes("· Proxies\n2 × IPv4"), proxy?.text);

  console.log("\n3. The one non-order alert kept: a refund that failed");
  await sendAdminActionNeeded("refund failed", "ada@example.com was charged ₦5,200 but got nothing <b>");
  const act = sent.at(-1);
  check("action-needed alert, escaped", (act?.text ?? "").startsWith("⚠️ <b>Action needed</b> · refund failed\n") && (act?.text ?? "").includes("&lt;b&gt;"), act?.text);

  console.log("\n4. Never breaks an order");
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
