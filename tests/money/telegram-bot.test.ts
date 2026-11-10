// Run with `npm run test:money`. The Telegram bot end to end against a real Postgres (PGlite):
// members only (connect a Rogue Socials account first), only OTP numbers and proxies,
// bot-only prices, admin-editable messages, announcements to members, and disconnecting.
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import * as schemaModule from "@/db/schema";
import { otpOrder, telegramAccount, user, wallet } from "@/db/schema";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}`, detail ?? ""); }
}

// Every Telegram API call is recorded instead of sent.
const sent: { method: string; chatId?: number | string; text?: string; keyboard?: unknown }[] = [];
process.env.TELEGRAM_SHOP_BOT_TOKEN = "test-token";
process.env.RESEND_API_KEY = "re_test"; // emails are attempted and fail quietly (fetch is mocked)
globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.includes("api.telegram.org")) {
    const method = url.split("/").pop()!;
    const body = JSON.parse(String(init?.body ?? "{}"));
    sent.push({ method, chatId: body.chat_id, text: body.text, keyboard: body.reply_markup?.inline_keyboard });
    return new Response(JSON.stringify({ ok: true, result: { message_id: 1, username: "roguetestbot" } }));
  }
  if (url.includes("exchangerate")) return new Response(JSON.stringify({ rates: { NGN: 1500 } }));
  return new Response("not mocked", { status: 500 });
}) as typeof fetch;

const lastText = () => sent.filter((s) => s.text).at(-1)?.text ?? "";
const lastKeyboard = () => JSON.stringify(sent.filter((s) => s.text).at(-1)?.keyboard ?? []);
const allText = () => sent.map((s) => s.text ?? "").join("\n---\n");

async function main() {
  const { pushSchema } = await import("drizzle-kit/api");
  const { apply } = await pushSchema(schemaModule as Record<string, unknown>, db as never);
  await apply();
  const { handleUpdate } = await import("@/lib/telegram-bot/handler");
  const { redeemLinkCode, unlinkTelegram } = await import("@/lib/telegram-bot/link");
  const { creditWallet, getOrCreateWallet } = await import("@/lib/wallet");
  const { setBotTexts } = await import("@/lib/telegram-bot/settings");
  const { setBotMarkup } = await import("@/lib/bot-pricing");
  const { getOtpPricer, setOtpSettings } = await import("@/lib/otp/settings");
  const { priceNgn, setProxySettings } = await import("@/lib/proxies/settings");
  const broadcast = await import("@/lib/telegram-bot/broadcast");

  const from = { id: 4242, first_name: "Ada", username: "ada" };
  const chat = { id: 4242, type: "private" };
  const say = (text: string, who = from) => handleUpdate({ message: { message_id: 1, chat: { id: who.id, type: "private" }, from: who, text } });
  const tap = (data: string, who = from) =>
    handleUpdate({ callback_query: { id: "cb", from: who, data, message: { message_id: 9, chat: { id: who.id, type: "private" } } } });
  void chat;

  console.log("\n1. Members only: no account is made from Telegram");
  const usersBefore = (await db.select().from(user)).length;
  await say("/start");
  const [acc] = await db.select().from(telegramAccount).where(eq(telegramAccount.telegramId, "4242"));
  check("Telegram row saved, not connected", !!acc && acc.userId === null, acc);
  check("no Rogue account created", (await db.select().from(user)).length === usersBefore);
  check("join message with one green connect button", /for Rogue Socials members/.test(lastText()) && /connect\/telegram\?code=[A-Z0-9]{8}/.test(lastKeyboard()) && lastKeyboard().includes('"style":"success"'), lastKeyboard());
  check("support button on the join screen", lastKeyboard().includes("t.me/"), lastKeyboard());
  await tap("ot:0");
  check("shop buttons don't work before connecting", /for Rogue Socials members/.test(lastText()), lastText());

  console.log("\n2. Connecting a Rogue Socials account");
  await say("/start");
  const code = lastKeyboard().match(/code=([A-Z0-9]{4})([A-Z0-9]{4})/);
  check("connect button carries a one-time code", !!code, lastKeyboard());
  const webId = "web-ada";
  await db.insert(user).values({ id: webId, name: "Ada", email: "ada@example.com", emailVerified: true });
  await creditWallet((await getOrCreateWallet(webId, "NGN")).id, "12500", "NGN");
  check("wrong code refused", !(await redeemLinkCode("AAAA-BBBB", webId)).ok);
  const r = await redeemLinkCode(`${code![1]}${code![2]}`.toLowerCase(), webId);
  check("code accepted (any case)", r.ok, r);
  const [acc2] = await db.select().from(telegramAccount).where(eq(telegramAccount.telegramId, "4242"));
  check("bot now uses the website account", acc2.userId === webId);
  check("customer told in the chat", /Connected to your Rogue Socials account/.test(allText()));
  check("code is single-use", !(await redeemLinkCode(`${code![1]}${code![2]}`, webId)).ok);

  console.log("\n3. Only OTP numbers and proxies, with editable messages");
  await say("/menu");
  check("menu shows the website balance", /12,500/.test(lastText()), lastText());
  check("menu has OTP numbers and proxies", lastKeyboard().includes("ot:0") && lastKeyboard().includes('"px"'), lastKeyboard());
  check("no logs or boosting in the menu", !/shop|bs:0|Logs|Boosting/.test(lastKeyboard()), lastKeyboard());
  check("menu has 2FA and support", lastKeyboard().includes('"tk"') && lastKeyboard().includes("Support"), lastKeyboard());
  check("menu buttons are coloured", lastKeyboard().includes('"style":"primary"') && lastKeyboard().includes('"style":"success"'), lastKeyboard());

  console.log("\n3b. 2FA codes in the bot");
  const { totp } = await import("@/lib/totp");
  await tap("tk");
  check("asks for the secret", /2FA secret key/.test(lastText()), lastText());
  await say("not a secret");
  check("rejects something that isn't a secret", /doesn't look like a 2FA secret/.test(lastText()), lastText());
  await say("user1|pw1|JBSWY3DPEHPK3PXP");
  const expected = await totp("JBSWY3DPEHPK3PXP");
  check("a whole log line gives the right code", lastText().includes(`${expected.slice(0, 3)} ${expected.slice(3)}`) || lastText().includes("next:"), lastText());
  check("New code button carries the secret", lastKeyboard().includes("tf:JBSWY3DPEHPK3PXP"), lastKeyboard());
  await tap("tf:JBSWY3DPEHPK3PXP");
  check("New code works", /Your code/.test(lastText()), lastText());
  await setBotTexts({ welcome: "Hey {name} — **{balance}** <script>" });
  await say("/menu");
  check("admin text used, placeholders filled, ** → bold", lastText().startsWith("Hey Ada — <b>₦12,500</b>"), lastText());
  check("admin text can't inject HTML", lastText().includes("&lt;script&gt;") && !lastText().includes("<script>"), lastText());
  await setBotTexts({ welcome: "" });
  await say("/menu");
  check("empty text goes back to the default", /Hi Ada/.test(lastText()), lastText());
  await say("instagram");
  check("typing a word shows the menu (no log search)", /Hi Ada/.test(lastText()), lastText());

  console.log("\n4. Bot-only prices");
  await setOtpSettings({ markupPercent: 50 });
  await setProxySettings({ markupPercent: 40 });
  const web = (await getOtpPricer("web"))(0.5);
  check("bot = website price while no bot markup is set", (await getOtpPricer("bot"))(0.5) === web, web);
  await setBotMarkup("otp", 30);
  await setBotMarkup("proxy", 10);
  check("website OTP price unchanged (₦1,130)", (await getOtpPricer("web"))(0.5) === 1130);
  check("bot OTP price uses the bot markup (₦980)", (await getOtpPricer("bot"))(0.5) === 980);
  check("bot proxy price uses the bot markup", (await priceNgn(2, "bot")) < (await priceNgn(2, "web")), { bot: await priceNgn(2, "bot"), web: await priceNgn(2, "web") });
  await setBotMarkup("otp", null);
  check("clearing the bot markup goes back to the website's", (await getOtpPricer("bot"))(0.5) === 1130);

  console.log("\n5. Announcements reach members only");
  for (const [i, n] of [["b1", 5001], ["b2", 5002]] as const) {
    await db.insert(user).values({ id: i, name: i, email: `${i}@example.com`, emailVerified: true });
    await db.insert(telegramAccount).values({ telegramId: String(n), userId: i, chatId: String(n), username: i });
  }
  await db.insert(telegramAccount).values({ telegramId: "6000", userId: null, chatId: "6000", username: "stranger" });
  check("member count ignores people who haven't connected", (await broadcast.memberCount()) === 3, await broadcast.memberCount());
  check("test goes to a member by @username", await broadcast.sendTest("Test **drop**", null, "@B1"));
  check("test refused for a non-member", !(await broadcast.sendTest("x", null, "stranger")));
  const mark = sent.length;
  let b = await broadcast.startBroadcast("🔥 **OTP numbers are cheaper!**", { text: "Open", url: "https://roguesocials.com" });
  let guard = 0;
  while (b.status === "sending" && guard++ < 10) b = await broadcast.sendNextBatch(b.id);
  const msgs = sent.slice(mark).filter((s) => s.method === "sendMessage");
  check("sent to all 3 members", b.status === "done" && b.sent === 3 && msgs.length === 3, b);
  check("not sent to the non-member", !msgs.some((m) => String(m.chatId) === "6000"));
  check("announcement formatted with its button", msgs.every((m) => m.text === "🔥 <b>OTP numbers are cheaper!</b>" && JSON.stringify(m.keyboard).includes("roguesocials.com")), msgs[0]);
  check("kept in history", (await broadcast.broadcastHistory())[0]?.id === b.id);
  check("only one announcement sends at a time", await broadcast.startBroadcast("a", null).then(() => broadcast.startBroadcast("b", null).then(() => false, () => true)).catch(() => false));
  check("bad button refused", broadcast.validButton("Open", "http://not-https") === "invalid");

  console.log("\n6. Disconnecting");
  await unlinkTelegram(webId);
  const [acc3] = await db.select().from(telegramAccount).where(eq(telegramAccount.telegramId, "4242"));
  check("link cleared, wallet stays with the website account", acc3.userId === null && Number((await db.select().from(wallet).where(eq(wallet.userId, webId)))[0].balance) === 12500);
  await say("/menu");
  check("bot asks to connect again", /for Rogue Socials members/.test(lastText()), lastText());
  check("no OTP orders were touched", (await db.select().from(otpOrder)).length === 0);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
