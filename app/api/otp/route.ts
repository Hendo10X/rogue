import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getCountries, otpOnSale } from "@/lib/otp/settings";
import { getOtpOrders, OTP_WAIT_MINUTES } from "@/lib/otp/orders";

export const dynamic = "force-dynamic";

// GET — countries on sale plus the customer's numbers (waiting ones checked for their SMS).
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const onSale = await otpOnSale();
  let countries: { id: string; name: string }[] = [];
  if (onSale) {
    try {
      countries = await getCountries();
    } catch (err) {
      console.error("[OTP] countries failed", err);
    }
  }
  const orders = await getOtpOrders(session.user.id);
  return NextResponse.json({ onSale, countries, waitMinutes: OTP_WAIT_MINUTES, orders });
}
