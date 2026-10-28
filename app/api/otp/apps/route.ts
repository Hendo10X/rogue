import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getApps, getOtpPricer, otpOnSale } from "@/lib/otp/settings";
import { outOfStockApps } from "@/lib/otp/stock";

export const dynamic = "force-dynamic";

// GET ?country=USA — apps for that country with the ₦ price per number.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await otpOnSale())) return NextResponse.json({ error: "OTP numbers aren't available right now." }, { status: 503 });
  const country = req.nextUrl.searchParams.get("country")?.trim();
  if (!country) return NextResponse.json({ error: "Pick a country first." }, { status: 400 });
  try {
    const [apps, price, hidden] = await Promise.all([getApps(country), getOtpPricer(), outOfStockApps(country)]);
    return NextResponse.json({
      apps: apps
        .filter((a) => !hidden.has(a.name))
        .map((a) => ({ name: a.name, label: a.label, priceNgn: price(a.priceUsd) })),
    });
  } catch (err) {
    console.error("[OTP] apps failed", country, err);
    return NextResponse.json({ error: "We couldn't load the apps for this country. Please try again." }, { status: 502 });
  }
}
