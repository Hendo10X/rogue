
import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
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
