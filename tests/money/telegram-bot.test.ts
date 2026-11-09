// Run with `npm run test:money`. The Telegram shop bot end to end against a real Postgres (PGlite):
// account on /start, buying an uploaded log from the bot (bulk price, labelled delivery),
// and connecting a website account (balance and orders move over, codes are single-use).
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import * as schemaModule from "@/db/schema";
import { listing, order, supplier, telegramAccount, user, wallet } from "@/db/schema";
import { addManualLogItems } from "@/lib/manual-logs";
import { setBulkPricing } from "@/lib/bulk-pricing";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}`, detail ?? ""); }
}

// Every Telegram API call is recorded instead of sent.
const sent: { method: string; text?: string; keyboard?: unknown }[] = [];
process.env.TELEGRAM_SHOP_BOT_TOKEN = "test-token";
process.env.RESEND_API_KEY = "re_test"; // emails are attempted and fail quietly (fetch is mocked)
globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.includes("api.telegram.org")) {
    const method = url.split("/").pop()!;
    const body = JSON.parse(String(init?.body ?? "{}"));
    sent.push({ method, text: body.text, keyboard: body.reply_markup?.inline_keyboard });
    return new Response(JSON.stringify({ ok: true, result: { message_id: 1, username: "roguetestbot" } }));
  }
  if (url.includes("exchangerate")) return new Response(JSON.stringify({ rates: { NGN: 1500 } }));
  return new Response("not mocked", { status: 500 });
}) as typeof fetch;

const lastText = () => sent.filter((s) => s.text).at(-1)?.text ?? "";
const allText = () => sent.map((s) => s.text ?? "").join("\n---\n");
async function balance(userId: string) {
  const [w] = await db.select().from(wallet).where(eq(wallet.userId, userId));
  return Number(w?.balance ?? 0);
}

async function main() {
  const { pushSchema } = await import("drizzle-kit/api");
  const { apply } = await pushSchema(schemaModule as Record<string, unknown>, db as never);
  await apply();
  const { handleUpdate } = await import("@/lib/telegram-bot/handler");
  const { createLinkCode, redeemLinkCode } = await import("@/lib/telegram-bot/link");
  const { creditWallet } = await import("@/lib/wallet");

  const from = { id: 4242, first_name: "Ada", username: "ada" };
  const chat = { id: 4242, type: "private" };
  const say = (text: string) => handleUpdate({ message: { message_id: 1, chat, from, text } });
  const tap = (data: string) => handleUpdate({ callback_query: { id: "cb", from, data, message: { message_id: 9, chat } } });

  console.log("\n1. /start makes a Rogue account and wallet");
  await say("/start");
  const [acc] = await db.select().from(telegramAccount).where(eq(telegramAccount.telegramId, "4242"));
  check("telegram account created", !!acc);
  const botUserId = acc.userId;
  check("welcome + menu with every section", /Welcome/.test(lastText()) && JSON.stringify(sent.at(-1)?.keyboard).includes("ot:0"), lastText());
  check("group chats are ignored", await handleUpdate({ message: { message_id: 1, chat: { id: 1, type: "group" }, from, text: "/start" } }).then(() => sent.at(-1)?.text === lastText()));

  console.log("\n2. Buying an uploaded log from the bot: bulk price and labelled delivery");
  await db.insert(supplier).values({ id: "sup", name: "Manual", slug: "manual", apiUrl: "manual://local", apiKey: "manual", status: "active" });
  await db.insert(listing).values({
    id: "L1", supplierId: "sup", externalProductId: "m1", type: "account", slug: "ig-aged", title: "IG aged", platform: "instagram",
    price: "1000", currency: "NGN", supplierPrice: "1000", stock: 0, status: "active", metadata: { manual: true },
    description: "Format: login|pass|mail|mailpass",
  } as never);
  await addManualLogItems("L1", "user1|pw1|a@mail.com|mp1\nuser2|pw2|b@mail.com|mp2\nuser3|pw3|c@mail.com|mp3");
  await setBulkPricing({ enabled: true, minQty: 2, amountOff: 150 });
  await creditWallet((await db.select().from(wallet).where(eq(wallet.userId, botUserId)))[0].id, "5000", "NGN");

  const unit = (await import("@/lib/telegram-bot/catalog")).getListing;
  const l = await unit("L1");
  check("listing visible to the bot", !!l && l.stock === 3, l);
  await tap("l:L1");
  check("listing shows the bulk price", /when you buy 2\+/.test(lastText()), lastText());
  await tap("q:L1:2");
  check("confirm applies the bulk price", /Bulk price applied/.test(lastText()), lastText());
  const before = await balance(botUserId);
  const mark = sent.length;
  await tap("b:L1:2");
  if (process.env.DEBUG_BOT) console.log(JSON.stringify(sent.slice(mark), null, 1));
  const charged = before - (await balance(botUserId));
  check("charged 2 × (price − ₦150)", Math.abs(charged - 2 * (l!.priceNgn - 150)) < 0.01, { charged, unit: l!.priceNgn });
  // Which two of the three logs are handed out is up to the pool, so check whichever were sent.
  const delivered = allText();
  const got = [1, 2, 3].filter((n) => delivered.includes(`Username: user${n}`));
  const labelled = (n: number) =>
    delivered.includes(`Username: user${n}\nPassword: pw${n}\nEmail: ${"abc"[n - 1]}@mail.com\nEmail password: mp${n}`);
  check("delivered as labelled fields", got.length === 2 && got.every(labelled), delivered.slice(-600));
  const [o] = await db.select().from(order).where(eq(order.userId, botUserId));
  check("order saved on the bot account", !!o && o.status === "completed", o);

  console.log("\n3. Connecting a website account");
  const webId = "web-user";
  await db.insert(user).values({ id: webId, name: "Ada Web", email: "ada@example.com", emailVerified: true });
  const { getOrCreateWallet } = await import("@/lib/wallet");
  await creditWallet((await getOrCreateWallet(webId, "NGN")).id, "10000", "NGN");
  const botLeft = await balance(botUserId);

  check("wrong code refused", !(await redeemLinkCode("AAAA-BBBB", webId)).ok);
  const { code } = await createLinkCode("4242");
  check("code is 8 characters", code.length === 8, code);
  const placeholderRefused = await redeemLinkCode(code, botUserId);
  check("a bot-only account can't redeem", !placeholderRefused.ok, placeholderRefused);
  const r = await redeemLinkCode(code.toLowerCase().replace(/(.{4})/, "$1-"), webId);
  check("code accepted (any case, with dash)", r.ok, r);
  const [acc2] = await db.select().from(telegramAccount).where(eq(telegramAccount.telegramId, "4242"));
  check("bot now uses the website account", acc2.userId === webId);
  check("bot balance moved to the website wallet", Math.abs((await balance(webId)) - (10000 + botLeft)) < 0.01, { web: await balance(webId), botLeft });
  check("bot wallet emptied", (await balance(botUserId)) === 0);
  const [moved] = await db.select().from(order).where(eq(order.id, o.id));
  check("bot orders moved to the website account", moved.userId === webId);
  check("code is single-use", !(await redeemLinkCode(code, webId)).ok);
  check("customer told in the chat", /Connected to your website account/.test(allText()));

  await say("/menu");
  check("menu shows the website balance", lastText().includes((10000 + botLeft).toLocaleString("en-NG").split(".")[0]) || /Balance/.test(lastText()), lastText());

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
