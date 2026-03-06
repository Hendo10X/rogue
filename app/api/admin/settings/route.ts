import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession, getSetting, setSetting } from "@/lib/admin-auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [marketplace, boosting] = await Promise.all([
    getSetting("markup_naira_marketplace"),
    getSetting("markup_naira_boosting"),
  ]);

  return NextResponse.json({
    markupNairaMarketplace: marketplace ? parseFloat(marketplace) : 0,
    markupNairaBoosting: boosting ? parseFloat(boosting) : 0,
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { marketplace?: number; boosting?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (typeof body.marketplace === "number" && body.marketplace >= 0) {
    await setSetting("markup_naira_marketplace", String(body.marketplace));
  }
  if (typeof body.boosting === "number" && body.boosting >= 0) {
    await setSetting("markup_naira_boosting", String(body.boosting));
  }

  return NextResponse.json({ ok: true });
}
