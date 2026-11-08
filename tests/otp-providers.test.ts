// OTP providers: catalog matching and provider clients against mocked
// GrizzlySMS / SMSPool answers (shapes from their docs). `npm run test:otp`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { appId, countryId, countryLabel } from "../lib/otp/catalog";

process.env.GRIZZLY_API_KEY = "test-grizzly";
process.env.SMSPOOL_API_KEY = "test-smspool";

test("countries match across providers by ISO code", () => {
  assert.equal(countryId("USA"), "us");
  assert.equal(countryId("United States", "US"), "us");
  assert.equal(countryId("USA (virtual)"), "us_virtual");
  assert.equal(countryId("United Kingdom"), "gb");
  assert.equal(countryId("England"), "gb");
  assert.equal(countryId("Nigeria"), "ng");
  assert.equal(countryId("Russia"), "ru");
  assert.equal(countryId("Czech Republic"), "cz");
  assert.equal(countryId("Côte d'Ivoire"), "ci");
  assert.equal(countryId("Atlantis"), null);
  assert.equal(countryLabel("us_virtual"), "United States (virtual)");
  assert.equal(countryLabel("ng"), "Nigeria");
  assert.equal(countryLabel("usa"), "Usa"); // legacy 5sim slug still readable
});

test("apps match across providers by name", () => {
  assert.equal(appId("Whatsapp"), "whatsapp");
  assert.equal(appId("WhatsApp"), "whatsapp");
  assert.equal(appId("Instagram + Threads"), "instagram");
  assert.equal(appId("Google, Gmail, Youtube"), "google");
  assert.equal(appId("Google Voice"), "google-voice");
  assert.equal(appId("X (Twitter)"), "twitter");
});

// ── Mocked HTTP ─────────────────────────────────────────────────────────────

type Handler = (url: URL, body: URLSearchParams) => unknown;
let routes: Record<string, Handler> = {};
const calls: string[] = [];

globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  const body = new URLSearchParams(typeof init?.body === "string" ? init.body : (init?.body as URLSearchParams | undefined)?.toString() ?? "");
  const key = url.hostname.includes("grizzly") ? `grizzly:${url.searchParams.get("action")}` : `smspool:${url.pathname}`;
  calls.push(key);
  const h = routes[key];
  if (!h) return new Response("BAD_ACTION", { status: 200 });
  const out = h(url, body);
  return new Response(typeof out === "string" ? out : JSON.stringify(out), { status: 200 });
}) as typeof fetch;

const grizzlyBase: Record<string, Handler> = {
  "grizzly:getCountries": () => ({ "187": { id: 187, eng: "USA", visible: 1 }, "12": { id: 12, eng: "USA (virtual)", visible: 1 }, "19": { id: 19, eng: "Nigeria", visible: 1 } }),
  "grizzly:getServicesList": () => ({ status: "success", services: [{ code: "wa", name: "Whatsapp" }, { code: "tg", name: "Telegram" }] }),
  // Two price levels: the cheap one is empty, so $0.90 (5 left) is the real price.
  "grizzly:getPricesV2": (u) => ({ [u.searchParams.get("country")!]: { wa: { "0.50": 0, "0.90": 5 }, tg: { "0.30": 40 } } }),
  "grizzly:getNumber": () => "ACCESS_NUMBER:38496653:12025550123",
  "grizzly:getStatus": () => "STATUS_OK:445566",
};

const smspoolBase: Record<string, Handler> = {
  "smspool:/country/retrieve_all": () => [{ ID: 1, name: "United States", short_name: "US" }, { ID: 2, name: "United Kingdom", short_name: "GB" }],
  "smspool:/service/retrieve_all": () => [{ ID: 1012, name: "WhatsApp" }, { ID: 907, name: "Telegram" }],
  "smspool:/request/pricing": (_u, b) =>
    [
      { service: 1012, service_name: "WhatsApp", pool: 7, price: "0.70" },
      { service: 1012, service_name: "WhatsApp", pool: 12, price: "1.20" },
      { service: 907, service_name: "Telegram", pool: 7, price: "0.60" },
    ].filter((r) => !b.get("service") || String(r.service) === b.get("service")),
  // Pool 7 is cheap but fails half the time; pool 12 is reliable.
  "smspool:/request/price": (_u, b) => (b.get("pool") === "7" ? { price: "0.70", success_rate: 54 } : { price: "1.20", success_rate: 92 }),
  "smspool:/sms/stock": () => ({ success: 1, amount: 100 }),
  "smspool:/purchase/sms": (_u, b) => ({ success: 1, number: 12025550199, order_id: "ABCDEFGH", pool: Number(b.get("pool")), cost: b.get("max_price") }),
  "smspool:/sms/check": () => ({ status: 3, sms: "12345", full_sms: "Your WhatsApp code: 123-45" }),
};

test("Grizzly: prices from the cheapest level that has numbers; buys capped at it", async () => {
  routes = { ...grizzlyBase };
  const { grizzly } = await import("../lib/otp/grizzly");
  const countries = await grizzly.countries();
  assert.deepEqual(countries.map((c) => c.id).sort(), ["ng", "us", "us_virtual"]);
  const apps = await grizzly.apps("us");
  assert.deepEqual(apps.find((a) => a.app === "whatsapp"), { app: "whatsapp", label: "WhatsApp", priceUsd: 0.9, stock: 5 });
  const q = await grizzly.quote("us", "whatsapp", { minSuccessRate: 60 });
  assert.deepEqual(q, { provider: "grizzly", priceUsd: 0.9, stock: 5 });

  let sent: URL | null = null;
  routes["grizzly:getNumber"] = (u) => ((sent = u), "ACCESS_NUMBER:38496653:12025550123");
  const bought = await grizzly.buy("us", "whatsapp", q!);
  assert.deepEqual(bought, { numberId: "38496653", number: "12025550123", priceUsd: 0.9 });
  assert.equal(sent!.searchParams.get("country"), "187");
  assert.equal(sent!.searchParams.get("service"), "wa");
  assert.equal(sent!.searchParams.get("maxPrice"), "0.9");

  assert.deepEqual(await grizzly.check("38496653"), { status: "RECEIVED", code: "445566", sms: null });
  routes["grizzly:getStatus"] = () => "STATUS_WAIT_CODE";
  assert.equal((await grizzly.check("1")).status, "PENDING");
  routes["grizzly:getStatus"] = () => "STATUS_CANCEL";
  assert.equal((await grizzly.check("1")).status, "CANCELED");
  routes["grizzly:getNumber"] = () => "NO_NUMBERS";
  await assert.rejects(grizzly.buy("us", "whatsapp", q!), /NO_NUMBERS/);
});

test("SMSPool: skips pools under the success-rate minimum; pins the buy to the chosen pool", async () => {
  routes = { ...smspoolBase };
  const { smspool } = await import("../lib/otp/smspool");
  const apps = await smspool.apps("us");
  assert.deepEqual(apps.find((a) => a.app === "whatsapp"), { app: "whatsapp", label: "WhatsApp", priceUsd: 0.7, stock: null });

  // 54% pool is skipped at a 60% minimum, so the reliable $1.20 pool is used.
  const q = await smspool.quote("us", "whatsapp", { minSuccessRate: 60 });
  assert.deepEqual(q, { provider: "smspool", priceUsd: 1.2, stock: 100, pool: "12", successRate: 92 });
  // With the minimum at 50%, the cheap pool qualifies.
  assert.equal((await smspool.quote("us", "whatsapp", { minSuccessRate: 50 }))?.pool, "7");

  let sent: URLSearchParams | null = null;
  routes["smspool:/purchase/sms"] = (_u, b) => ((sent = b), { success: 1, number: 12025550199, order_id: "ABCDEFGH", cost: "1.20" });
  const bought = await smspool.buy("us", "whatsapp", q!);
  assert.deepEqual(bought, { numberId: "ABCDEFGH", number: "12025550199", priceUsd: 1.2 });
  assert.equal(sent!.get("pool"), "12");
  assert.equal(sent!.get("max_price"), "1.2");
  assert.equal(sent!.get("country"), "1");
  assert.equal(sent!.get("service"), "1012");

  assert.deepEqual(await smspool.check("ABCDEFGH"), { status: "RECEIVED", code: "12345", sms: "Your WhatsApp code: 123-45" });
  routes["smspool:/sms/check"] = () => ({ status: 6, message: "This order has been refunded" });
  assert.equal((await smspool.check("X")).status, "CANCELED");
  routes["smspool:/sms/check"] = () => ({ status: 1, time_left: 1100 });
  assert.equal((await smspool.check("X")).status, "PENDING");

  // Out of stock everywhere → no quote.
  routes["smspool:/sms/stock"] = () => ({ success: 1, amount: 0 });
  assert.equal(await smspool.quote("us", "whatsapp", { minSuccessRate: 0 }), null);
  // API errors carry SMSPool's message.
  routes["smspool:/purchase/sms"] = () => ({ success: 0, message: "This service is out of stock." });
  await assert.rejects(smspool.buy("us", "whatsapp", q!), /out of stock/);
});
