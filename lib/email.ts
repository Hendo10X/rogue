
import { Resend } from "resend";

let _resend: Resend | null = null;
export function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const ADMIN_EMAIL = "Vinseven8@gmail.com";

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
}

export async function sendOrderDeliveryEmail({
  to,
  orderId,
  platform,
  details,
}: OrderEmailParams) {
  const { username, password, email, emailPassword, notes } = details;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #333;">Order Delivered!</h2>
      <p>Your order for <strong>${platform}</strong> has been successfully processed.</p>
      
      <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #555;">Account details:</h3>
        <ul style="list-style: none; padding: 0;">
          ${username ? `<li><strong>Username:</strong> ${username}</li>` : ""}
          ${password ? `<li><strong>Password:</strong> ${password}</li>` : ""}
          ${email ? `<li><strong>Email:</strong> ${email}</li>` : ""}
          ${emailPassword ? `<li><strong>Email Password:</strong> ${emailPassword}</li>` : ""}
        </ul>
        ${notes ? `<p style="margin-top: 10px; font-size: 0.9em; color: #666; border-top: 1px solid #ddd; pt: 10px;">${notes}</p>` : ""}
      </div>
      
      <p style="font-size: 0.8em; color: #999;">Order ID: ${orderId}</p>
      <p>Thank you for your purchase!</p>
    </div>
  `;

  try {
    const data = await getResend().emails.send({
      from: "Rogue <noreply@roguesocials.com>",
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

interface AdminOrderNotifyParams {
  orderId: string;
  orderType: "marketplace" | "boosting";
  userEmail: string;
  userName: string;
  amount: string;
  currency: string;
  platform?: string;
  serviceName?: string;
  status: string;
}

export async function sendAdminOrderNotification({
  orderId,
  orderType,
  userEmail,
  userName,
  amount,
  currency,
  platform,
  serviceName,
  status,
}: AdminOrderNotifyParams) {
  const amountFormatted = currency === "NGN"
    ? `₦${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`
    : `${parseFloat(amount).toFixed(2)} ${currency}`;

  const productLabel = orderType === "marketplace"
    ? `Marketplace — ${platform ?? "N/A"}`
    : `Boosting — ${serviceName ?? "N/A"}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #333;">New Order Received</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 130px;">Order ID</td>
          <td style="padding: 8px 0; font-weight: 600;">${orderId.slice(0, 8)}...</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Type</td>
          <td style="padding: 8px 0; font-weight: 600;">${productLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Amount</td>
          <td style="padding: 8px 0; font-weight: 600; color: #16a34a;">${amountFormatted}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Customer</td>
          <td style="padding: 8px 0;">${userName} (${userEmail})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Status</td>
          <td style="padding: 8px 0; font-weight: 600;">${status}</td>
        </tr>
      </table>
      
      <p style="font-size: 0.85em; color: #999;">This is an automated notification from Rogue.</p>
    </div>
  `;

  try {
    await getResend().emails.send({
      from: "Rogue <noreply@roguesocials.com>",
      to: ADMIN_EMAIL,
      subject: `New ${orderType} order — ${amountFormatted} from ${userName}`,
      html,
    });
  } catch (error) {
    console.error("[Admin Notify] Failed to send:", error);
  }
}

interface AdminDepositNotifyParams {
  depositId: string;
  provider: "korapay" | "plisio";
  userEmail: string;
  userName: string;
  amount: string;
  currency: string;
}

export async function sendAdminDepositNotification({
  depositId,
  provider,
  userEmail,
  userName,
  amount,
  currency,
}: AdminDepositNotifyParams) {
  const amountFormatted = currency === "NGN"
    ? `₦${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`
    : `${parseFloat(amount).toFixed(2)} ${currency}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #333;">Wallet Funded</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 130px;">Customer</td>
          <td style="padding: 8px 0; font-weight: 600;">${userName} (${userEmail})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Amount</td>
          <td style="padding: 8px 0; font-weight: 600; color: #16a34a;">${amountFormatted}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Provider</td>
          <td style="padding: 8px 0; font-weight: 600;">${provider === "korapay" ? "Korapay (Card/Bank)" : "Plisio (Crypto)"}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Deposit ID</td>
          <td style="padding: 8px 0;">${depositId.slice(0, 8)}...</td>
        </tr>
      </table>
      
      <p style="font-size: 0.85em; color: #999;">This is an automated notification from Rogue.</p>
    </div>
  `;

  try {
    await getResend().emails.send({
      from: "Rogue <noreply@roguesocials.com>",
      to: ADMIN_EMAIL,
      subject: `Wallet funded — ${amountFormatted} by ${userName} via ${provider}`,
      html,
    });
  } catch (error) {
    console.error("[Admin Deposit Notify] Failed to send:", error);
  }
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
    ? `₦${parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`
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
      <p style="margin: 8px 0 0; font-size: 12px; color: #999;">If you need help, reply to this email.</p>
    </div>
  `;

  try {
    const data = await getResend().emails.send({
      from: "Rogue <noreply@roguesocials.com>",
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
