
import { Resend } from "resend";
import { sendTelegramMessage, escapeHtml } from "./telegram";
import { formatAmount } from "./currency";
import { labelLog, type LogFormat } from "./log-fields";
import { SUPPORT_EMAIL } from "./site";

/** Telegram bot customers get a placeholder address that must never be emailed. */
export const TELEGRAM_EMAIL_DOMAIN = "telegram.roguesocials.com";
export function isPlaceholderEmail(to: string | string[] | undefined): boolean {
  return [to ?? []].flat().some((t) => t.endsWith("@" + TELEGRAM_EMAIL_DOMAIN));
}

let _resend: Resend | null = null;
export function getResend() {
  if (!_resend) {
    const client = new Resend(process.env.RESEND_API_KEY);
    // Skip sends to Telegram placeholder addresses (the bot tells them instead).
    const send = client.emails.send.bind(client.emails);
    client.emails.send = ((payload: Parameters<typeof send>[0], ...rest: unknown[]) =>
      isPlaceholderEmail(payload.to)
        ? Promise.resolve({ data: null, error: null, headers: null })
        : (send as (...a: unknown[]) => ReturnType<typeof send>)(payload, ...rest)) as typeof send;
    _resend = client;
  }
  return _resend;
}

interface OrderEmailParams {
  to: string;
  orderId: string;
  platform: string;
  details: {
    username?: string;
    password?: string;
    email?: string;
    emailPassword?: string;
    notes?: string;
  };
  /** The listing's log format, so each delivered line is shown as labelled fields. */
  format?: LogFormat | null;
}

const mono = "font-family: ui-monospace, Menlo, Consolas, monospace; word-break: break-all;";

/** One block per delivered log: "Username: …" rows, or the raw line when it isn't a delimited log. */
function deliveredLogsHtml(notes: string, format?: LogFormat | null): string {
  const lines = notes.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines
    .map((line, i) => {
      const fields = labelLog(line, format);
      const body = fields
        ? fields
            .map((f) => `<div style="margin: 2px 0;"><span style="color: #777;">${escapeHtml(f.label)}:</span> <span style="${mono}">${escapeHtml(f.value)}</span></div>`)
            .join("")
        : `<div style="${mono}">${escapeHtml(line)}</div>`;
      const title = lines.length > 1 ? `<div style="font-size: 0.8em; color: #999; margin-bottom: 4px;">Log ${i + 1}</div>` : "";
      return `<div style="padding: 10px 0; ${i ? "border-top: 1px solid #e5e5e5;" : ""}">${title}${body}</div>`;
    })
    .join("");
}

export async function sendOrderDeliveryEmail({
  to,
  orderId,
  platform,
  details,
  format,
}: OrderEmailParams) {
  const { username, password, email, emailPassword, notes } = details;

  // The delivered logs carry everything; the single fields are only a fallback.
  const body = notes?.trim()
    ? deliveredLogsHtml(notes, format)
    : `<ul style="list-style: none; padding: 0;">
          ${username ? `<li><strong>Username:</strong> ${escapeHtml(username)}</li>` : ""}
          ${password ? `<li><strong>Password:</strong> ${escapeHtml(password)}</li>` : ""}
          ${email ? `<li><strong>Email:</strong> ${escapeHtml(email)}</li>` : ""}
          ${emailPassword ? `<li><strong>Email Password:</strong> ${escapeHtml(emailPassword)}</li>` : ""}
        </ul>`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #333;">Order Delivered!</h2>
      <p>Your order for <strong>${escapeHtml(platform)}</strong> has been successfully processed.</p>

      <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #555;">Account details:</h3>
        ${body}
      </div>

      <p style="font-size: 0.8em; color: #999;">Order ID: ${orderId}</p>
      <p>Thank you for your purchase!</p>
      <p style="font-size: 0.8em; color: #999;">Need help with this order? Just reply to this email, or write to ${SUPPORT_EMAIL}.</p>
    </div>
  `;

  try {
    const data = await getResend().emails.send({
      from: "Rogue <noreply@roguesocials.com>",
      replyTo: SUPPORT_EMAIL,
      to,
      subject: `Order Delivered: ${platform} (#${orderId.slice(0, 8)})`,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}

// ─── Admin Telegram alerts ──────────────────────────────────────────────────
// Only successful orders reach the admin chat, in three short lines, plus the
// rare "a customer is owed money" case. Signups, wallet top-ups, refunded
// failures and log requests no longer do: they buried the orders. (Supplier
// low-balance alerts live in lib/suppliers/balance-alert.ts.)

interface AdminOrderNotifyParams {
  /** Kept for callers; not shown (the admin finds orders by customer). */
  orderId?: string;
  orderType: "marketplace" | "boosting" | "otp" | "proxy";
  userEmail: string;
  userName: string;
  amount: string;
  currency: string;
  platform?: string;
  /** Boosting service, or the OTP/proxy description (e.g. "WhatsApp · United States"). */
  serviceName?: string;
  /** What was bought, e.g. the log's title (falls back to platform / serviceName). */
  product?: string;
  quantity?: number;
  /** Kept for callers; not shown (every alert is a successful order). */
  status?: string;
  /** Where it was bought, when not the website (e.g. "Telegram bot", "API · Key name"). */
  via?: string;
  /** A manual listing the admin has to deliver by hand. */
  needsDelivery?: boolean;
}

const ORDER_TYPE_LABEL: Record<AdminOrderNotifyParams["orderType"], string> = {
  marketplace: "Logs",
  boosting: "Boosting",
  otp: "OTP number",
  proxy: "Proxies",
};

/** The alert text, e.g. "✅ ₦9,000 · Logs × 2 / POLAND FB (0-50 friend) / Ada · ada@x.com · Telegram bot". */
export function adminOrderText(p: AdminOrderNotifyParams): string {
  const amount = p.currency === "NGN" ? `₦${formatAmount(p.amount)}` : `${parseFloat(p.amount).toFixed(2)} ${p.currency}`;
  const what = (p.product ?? (p.orderType === "marketplace" ? p.platform : p.serviceName) ?? "").trim();
  const qty = p.quantity && p.quantity > 1 ? ` × ${p.quantity.toLocaleString("en-NG")}` : "";
  return [
    `✅ <b>${escapeHtml(amount)}</b> · ${ORDER_TYPE_LABEL[p.orderType]}${qty}`,
    ...(what ? [escapeHtml(what.length > 120 ? `${what.slice(0, 117)}…` : what)] : []),
    `${escapeHtml(p.userName)} · ${escapeHtml(p.userEmail)}${p.via ? ` · ${escapeHtml(p.via)}` : ""}`,
    ...(p.needsDelivery ? ["📦 Deliver it on Ozymandias → Orders"] : []),
  ].join("\n");
}

export async function sendAdminOrderNotification(p: AdminOrderNotifyParams) {
  await sendTelegramMessage(adminOrderText(p));
}

/** The one non-order alert kept: something an admin must fix by hand (e.g. a refund that failed). */
export async function sendAdminActionNeeded(title: string, detail: string) {
  await sendTelegramMessage(`⚠️ <b>Action needed</b> · ${escapeHtml(title)}\n${escapeHtml(detail)}`);
}

interface BoostingOrderPlacedEmailParams {
  to: string;
  userName: string;
  orderId: string;
  serviceName: string;
  category?: string | null;
  link: string;
  quantity: number;
  amount: string;
  currency: string;
  status: string;
}

export async function sendBoostingOrderPlacedEmail({
  to,
  userName,
  orderId,
  serviceName,
  category,
  link,
  quantity,
  amount,
  currency,
  status,
}: BoostingOrderPlacedEmailParams) {
  const amountFormatted = currency === "NGN"
    ? `₦${formatAmount(amount)}`
    : `${parseFloat(amount).toFixed(2)} ${currency}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
      <h2 style="color: #111; margin: 0 0 8px;">Boosting order received</h2>
      <p style="color: #444; margin: 0 0 18px;">Hi ${userName ?? "there"}, we’ve sent your order to our supplier. You can track it in your Orders page.</p>
      
      <div style="background: #fafafa; padding: 14px 16px; border-radius: 10px; border: 1px solid #eee;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 140px;">Service</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111;">${serviceName}</td>
          </tr>
          ${category ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">Category</td>
            <td style="padding: 8px 0; color: #111;">${category}</td>
          </tr>` : ""}
          <tr>
            <td style="padding: 8px 0; color: #666;">Quantity</td>
            <td style="padding: 8px 0; color: #111;">${quantity}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Link</td>
            <td style="padding: 8px 0; color: #111; word-break: break-all;">${link}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Amount</td>
            <td style="padding: 8px 0; font-weight: 700; color: #16a34a;">${amountFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Status</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111;">${status}</td>
          </tr>
        </table>
      </div>

      <p style="margin: 18px 0 0; font-size: 12px; color: #999;">Order ID: ${orderId.slice(0, 8)}...</p>
      <p style="margin: 8px 0 0; font-size: 12px; color: #999;">Need help? Just reply to this email, or write to ${SUPPORT_EMAIL}.</p>
    </div>
  `;

  try {
    const data = await getResend().emails.send({
      from: "Rogue <noreply@roguesocials.com>",
      replyTo: SUPPORT_EMAIL,
      to,
      subject: `Boosting order placed (#${orderId.slice(0, 8)})`,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error("[Boosting Email] Failed to send:", error);
    return { success: false, error };
  }
}
