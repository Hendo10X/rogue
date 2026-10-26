import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { getApps, otpOnSale, otpPriceNgn } from "@/lib/otp/settings";

export const dynamic = "force-dynamic";

// GET ?country=USA — apps for that country with the ₦ price per number.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await otpOnSale())) return NextResponse.json({ error: "OTP numbers aren't available right now." }, { status: 503 });
  const country = req.nextUrl.searchParams.get("country")?.trim();
  if (!country) return NextResponse.json({ error: "Pick a country first." }, { status: 400 });
  try {
    const apps = await getApps(country);
    const priced = await Promise.all(apps.map(async (a) => ({ name: a.name, priceNgn: await otpPriceNgn(a.priceUsd) })));
    return NextResponse.json({ apps: priced });
  } catch {
    return NextResponse.json({ error: "We couldn't load the apps for this country. Please try again." }, { status: 502 });
  }
}
