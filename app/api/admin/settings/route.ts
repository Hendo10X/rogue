import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifyAdminSession, getSetting, setSetting } from "@/lib/admin-auth";
import { MARKETPLACE_PRICING_DEFAULTS } from "@/lib/pricing";

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

  const [
    marketplace,
    boosting,
    announcement,
    boostingAnnouncement,
    actionPin,
    mpFlatFee,
    mpThreshold,
    mpPercent,
    mpPriceCap,
    apiMarkup,
  ] = await Promise.all([
    getSetting("markup_naira_marketplace"),
    getSetting("markup_naira_boosting"),
    getSetting("site_announcement"),
    getSetting("boosting_announcement"),
    getSetting("action_pin"),
    getSetting("mp_flat_fee_naira"),
    getSetting("mp_threshold_naira"),
    getSetting("mp_percent"),
    getSetting("mp_price_cap_naira"),
    getSetting("api_markup_percent"),
  ]);

  const numOr = (v: string | null, d: number) => {
    const n = v != null ? parseFloat(v) : NaN;
    return Number.isFinite(n) ? n : d;
  };

  return NextResponse.json({
    markupNairaMarketplace: marketplace ? parseFloat(marketplace) : 0,
    markupNairaBoosting: boosting ? parseFloat(boosting) : 0,
    announcement: announcement ? JSON.parse(announcement) : null,
    boostingAnnouncement: boostingAnnouncement ? JSON.parse(boostingAnnouncement) : null,
    hasActionPin: !!actionPin,
    pricing: {
      flatFeeNaira: numOr(mpFlatFee, MARKETPLACE_PRICING_DEFAULTS.flatFeeNaira),
      thresholdNaira: numOr(mpThreshold, MARKETPLACE_PRICING_DEFAULTS.thresholdNaira),
      percent: numOr(mpPercent, MARKETPLACE_PRICING_DEFAULTS.percent),
      priceCapNaira: numOr(mpPriceCap, MARKETPLACE_PRICING_DEFAULTS.priceCapNaira),
    },
    apiMarkupPercent: numOr(apiMarkup, 30),
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
    pricing?: {
      flatFeeNaira?: number;
      thresholdNaira?: number;
      percent?: number;
      priceCapNaira?: number;
    };
    apiMarkupPercent?: number;
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
  if (body.pricing) {
    const p = body.pricing;
    if (typeof p.flatFeeNaira === "number" && p.flatFeeNaira >= 0) {
      await setSetting("mp_flat_fee_naira", String(p.flatFeeNaira));
    }
    if (typeof p.thresholdNaira === "number" && p.thresholdNaira >= 0) {
      await setSetting("mp_threshold_naira", String(p.thresholdNaira));
    }
    if (typeof p.percent === "number" && p.percent >= 0) {
      await setSetting("mp_percent", String(p.percent));
    }
    if (typeof p.priceCapNaira === "number" && p.priceCapNaira >= 0) {
      await setSetting("mp_price_cap_naira", String(p.priceCapNaira));
    }
  }

  if (
    typeof body.apiMarkupPercent === "number" &&
    body.apiMarkupPercent >= 0 &&
    body.apiMarkupPercent <= 1000
  ) {
    await setSetting("api_markup_percent", String(body.apiMarkupPercent));
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
