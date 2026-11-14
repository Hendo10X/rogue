import type { Resend } from "resend";
import { escapeHtml } from "@/lib/telegram";

/**
 * support@roguesocials.com → the owner's Gmail, for free.
 *
 * roguesocials.com's MX already points at Resend, so every email sent to any
 * @roguesocials.com address reaches Resend, which calls our webhook
 * (app/api/webhooks/resend). We fetch the email and re-send it to
 * SUPPORT_FORWARD_TO with Reply-To set to the customer, so pressing Reply in
 * Gmail answers them. (To reply *as* support@, Gmail's "Send mail as" uses
 * Resend's SMTP; see the PR notes.)
 *
 * Forwarded: anything addressed to our domain (support@, and customers
 * replying to noreply@ order emails). Not forwarded: mail from our own domain,
 * so a misconfigured reply can never loop.
 */

export const SUPPORT_ADDRESS = (process.env.SUPPORT_EMAIL ?? "support@roguesocials.com").toLowerCase();
const DOMAIN = SUPPORT_ADDRESS.split("@")[1] ?? "roguesocials.com";

/** "Ada <ada@x.com>" → { name: "Ada", address: "ada@x.com" }. */
export function parseAddress(raw: string): { name: string | null; address: string } {
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || null, address: m[2].trim().toLowerCase() };
  return { name: null, address: raw.trim().toLowerCase() };
}

const ourDomain = (address: string) => address.endsWith(`@${DOMAIN}`);

export type ForwardResult =
  | { forwarded: true; id: string }
  | { forwarded: false; reason: "not_configured" | "not_for_us" | "from_us" | "send_failed"; detail?: string };

/** Forwards one received email (by Resend id) to the owner's inbox. */
export async function forwardSupportEmail(resend: Resend, emailId: string): Promise<ForwardResult> {
  const forwardTo = process.env.SUPPORT_FORWARD_TO?.trim();
  if (!forwardTo) return { forwarded: false, reason: "not_configured" };

  const { data: email, error } = await resend.emails.receiving.get(emailId);
  if (error || !email) return { forwarded: false, reason: "send_failed", detail: error?.message ?? "email not found" };

  const recipients = [...(email.to ?? []), ...(email.cc ?? [])].map((t) => parseAddress(t).address);
  if (!recipients.some(ourDomain)) return { forwarded: false, reason: "not_for_us" };
  const sender = parseAddress(email.reply_to?.[0] ?? email.from);
  if (ourDomain(sender.address)) return { forwarded: false, reason: "from_us" };

  // Attachments come as short-lived download links; re-attach them.
  const attachments: { filename: string; content: string; content_type?: string }[] = [];
  const { data: list } = await resend.emails.receiving.attachments.list({ emailId });
  for (const a of list?.data ?? []) {
    try {
      const res = await fetch(a.download_url);
      if (!res.ok) continue;
      attachments.push({
        filename: a.filename ?? "attachment",
        content: Buffer.from(await res.arrayBuffer()).toString("base64"),
        content_type: a.content_type,
      });
    } catch {
      // A missing attachment shouldn't stop the message itself.
    }
  }

  const who = sender.name ? `${sender.name} <${sender.address}>` : sender.address;
  const toWhich = recipients.find(ourDomain) ?? SUPPORT_ADDRESS;
  const note = `From ${who} to ${toWhich}. Reply to answer them.`;
  const html = `<p style="font:13px sans-serif;color:#666;border-bottom:1px solid #eee;padding-bottom:8px">${escapeHtml(note)}</p>${
    email.html ?? `<pre style="white-space:pre-wrap;font:14px sans-serif">${escapeHtml(email.text ?? "")}</pre>`
  }`;
  const text = `${note}\n\n${email.text ?? ""}`;

  const { data: sent, error: sendError } = await resend.emails.send({
    from: `${sender.name ?? sender.address} via Rogue Support <${SUPPORT_ADDRESS}>`,
    to: [forwardTo],
    replyTo: sender.address,
    subject: email.subject?.trim() || "(no subject)",
    html,
    text,
    ...(attachments.length ? { attachments } : {}),
  });
  if (sendError || !sent) return { forwarded: false, reason: "send_failed", detail: sendError?.message };
  return { forwarded: true, id: sent.id };
}
