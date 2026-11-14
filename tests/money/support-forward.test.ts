// Run with `npm run test:money`. support@roguesocials.com → owner's Gmail via the Resend inbound webhook.
import { createHmac } from "crypto";
import { NextRequest } from "next/server";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}`, detail ?? ""); }
}

const KEY = Buffer.from("test-webhook-signing-key-32bytes!").toString("base64");
process.env.RESEND_WEBHOOK_SECRET = `whsec_${KEY}`;
process.env.RESEND_API_KEY = "re_test";
process.env.SUPPORT_FORWARD_TO = "owner@gmail.com";

// A fake Resend API: received emails by id, their attachments, and captured sends.
const inbox: Record<string, Record<string, unknown>> = {
  E1: {
    object: "email", id: "E1", from: "Ada Lovelace <ada@example.com>", to: ["support@roguesocials.com"], cc: null, bcc: null,
    reply_to: null, subject: "My order didn't arrive", html: "<p>Hi, order <b>123</b>?</p>", text: "Hi, order 123?",
    headers: null, message_id: "<m1@example.com>", created_at: "2026-11-14T10:00:00Z", attachments: [],
  },
  E2: {
    object: "email", id: "E2", from: "support@roguesocials.com", to: ["support@roguesocials.com"], cc: null, bcc: null,
    reply_to: null, subject: "loop", html: null, text: "x", headers: null, message_id: "<m2>", created_at: "", attachments: [],
  },
  E3: {
    object: "email", id: "E3", from: "Bob <bob@example.com>", to: ["noreply@roguesocials.com"], cc: null, bcc: null,
    reply_to: null, subject: "Re: Order Delivered", html: null, text: "Thanks <3", headers: null, message_id: "<m3>", created_at: "", attachments: [],
  },
  E4: {
    object: "email", id: "E4", from: "spam@example.com", to: ["someone@elsewhere.com"], cc: null, bcc: null,
    reply_to: null, subject: "x", html: null, text: "x", headers: null, message_id: "<m4>", created_at: "", attachments: [],
  },
};
const sends: Record<string, unknown>[] = [];
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? String(input) : input.url);
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
  if (url.hostname === "files.example") return new Response(Buffer.from("PDFDATA"));
  const att = url.pathname.match(/^\/emails\/receiving\/(\w+)\/attachments$/);
  if (att) {
    return json({ object: "list", has_more: false, data: att[1] === "E1"
      ? [{ id: "a1", filename: "receipt.pdf", size: 7, content_type: "application/pdf", content_disposition: "attachment", download_url: "https://files.example/a1", expires_at: "" }]
      : [] });
  }
  const get = url.pathname.match(/^\/emails\/receiving\/(\w+)$/);
  if (get) return inbox[get[1]] ? json(inbox[get[1]]) : json({ name: "not_found", message: "Not found", statusCode: 404 }, 404);
  if (url.pathname === "/emails" && init?.method === "POST") {
    sends.push(JSON.parse(String(init.body)));
    return json({ id: `sent-${sends.length}` });
  }
  return json({ message: "not mocked" }, 500);
}) as typeof fetch;

function signed(body: string, opts: { bad?: boolean } = {}) {
  const id = "msg_test";
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from(KEY, "base64")).update(`${id}.${ts}.${body}`).digest("base64");
  return new NextRequest("http://localhost/api/webhooks/resend", {
    method: "POST",
    body,
    headers: { "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${opts.bad ? "AAAA" + sig.slice(4) : sig}` },
  });
}
const event = (emailId: string) => JSON.stringify({ type: "email.received", created_at: "", data: { email_id: emailId, subject: "x" } });

async function main() {
  const { POST } = await import("@/app/api/webhooks/resend/route");

  console.log("\n1. A customer writes to support@");
  const r1 = await POST(signed(event("E1")));
  const b1 = await r1.json();
  check("accepted and forwarded", r1.status === 200 && b1.forwarded === true, b1);
  const s = sends.at(-1) ?? {};
  check("sent to the owner's Gmail", JSON.stringify(s.to) === JSON.stringify(["owner@gmail.com"]), s.to);
  check("Reply goes to the customer", s.reply_to === "ada@example.com", s.reply_to);
  check("from support@, showing the customer's name", s.from === "Ada Lovelace via Rogue Support <support@roguesocials.com>", s.from);
  check("original subject kept (threads nicely)", s.subject === "My order didn't arrive", s.subject);
  check("original message included, with who sent it", String(s.html).includes("order <b>123</b>") && String(s.text).includes("From Ada Lovelace <ada@example.com>"), s.html);
  const atts = (s.attachments ?? []) as { filename: string; content: string }[];
  check("attachment re-attached", atts.length === 1 && atts[0].filename === "receipt.pdf" && Buffer.from(atts[0].content, "base64").toString() === "PDFDATA", atts);

  console.log("\n2. Replies to order emails (noreply@) reach support too");
  const r3 = await (await POST(signed(event("E3")))).json();
  check("forwarded", r3.forwarded === true && (sends.at(-1)?.reply_to === "bob@example.com"), r3);

  console.log("\n3. Never loops, never forwards someone else's mail");
  const before = sends.length;
  const r2 = await (await POST(signed(event("E2")))).json();
  check("mail from our own domain is not forwarded", r2.forwarded === false && r2.reason === "from_us", r2);
  const r4 = await (await POST(signed(event("E4")))).json();
  check("mail not addressed to our domain is not forwarded", r4.forwarded === false && r4.reason === "not_for_us", r4);
  check("nothing extra was sent", sends.length === before);

  console.log("\n4. Only Resend can call it");
  const bad = await POST(signed(event("E1"), { bad: true }));
  check("forged signature refused", bad.status === 401, bad.status);
  const none = await POST(new NextRequest("http://localhost/api/webhooks/resend", { method: "POST", body: event("E1") }));
  check("unsigned request refused", none.status === 400, none.status);
  const other = await (await POST(signed(JSON.stringify({ type: "email.delivered", created_at: "", data: {} })))).json();
  check("other Resend events are ignored", other.ignored === "email.delivered", other);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
