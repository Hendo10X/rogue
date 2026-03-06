
import "dotenv/config";
import { sendOrderDeliveryEmail } from "../lib/email";

async function testEmail() {
  console.log("Testing Resend email delivery...");
  const result = await sendOrderDeliveryEmail({
    to: "test@example.com", // Change this to a real email for actual testing if needed
    orderId: "test-order-123",
    platform: "Instagram",
    details: {
      username: "testuser",
      password: "testpassword",
      email: "testemail@gmail.com",
      emailPassword: "emailpass123",
      notes: "This is a test delivery with structured data.",
    },
  });

  if (result.success) {
    console.log("Email sent successfully!", result.data);
  } else {
    console.error("Email failed:", result.error);
  }
}

testEmail();
