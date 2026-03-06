
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const data = await resend.emails.send({
      from: "Rogue <onboarding@resend.dev>", // Replace with verified domain in production
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
