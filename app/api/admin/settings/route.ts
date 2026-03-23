import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
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

  const [marketplace, boosting, announcement, boostingAnnouncement, actionPin] = await Promise.all([
    getSetting("markup_naira_marketplace"),
    getSetting("markup_naira_boosting"),
    getSetting("site_announcement"),
    getSetting("boosting_announcement"),
    getSetting("action_pin"),
  ]);

  return NextResponse.json({
    markupNairaMarketplace: marketplace ? parseFloat(marketplace) : 0,
    markupNairaBoosting: boosting ? parseFloat(boosting) : 0,
    announcement: announcement ? JSON.parse(announcement) : null,
    boostingAnnouncement: boostingAnnouncement ? JSON.parse(boostingAnnouncement) : null,
    hasActionPin: !!actionPin,
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    marketplace?: number;
    boosting?: number;
    announcement?: {
      active: boolean;
      type: "banner" | "modal";
      message: string;
      id: string;
    } | null;
    boostingAnnouncement?: {
      active: boolean;
      message: string;
      id: string;
    } | null;
    actionPin?: string;
  };
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
  if (body.announcement !== undefined) {
    if (body.announcement === null) {
      await setSetting("site_announcement", "");
    } else {
      await setSetting("site_announcement", JSON.stringify(body.announcement));
    }
  }
  if (body.boostingAnnouncement !== undefined) {
    if (body.boostingAnnouncement === null) {
      await setSetting("boosting_announcement", "");
    } else {
      await setSetting("boosting_announcement", JSON.stringify(body.boostingAnnouncement));
    }
  }
  if (typeof body.actionPin === "string") {
    const pin = body.actionPin.trim();
    if (pin === "") {
      await setSetting("action_pin", "");
    } else if (/^\d{4}$/.test(pin)) {
      await setSetting("action_pin", pin);
    } else {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
