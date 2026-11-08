import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-route";
import { getOtpSettings, setOtpSettings } from "@/lib/otp/settings";
import { fetchBalances, getProviderSettings, otpProviderConfigured, setProviderSettings } from "@/lib/otp/provider";
import { clearOutOfStock, hiddenCount } from "@/lib/otp/stock";

export const dynamic = "force-dynamic";

async function state() {
  const [settings, providerSettings, balances, hiddenApps] = await Promise.all([
    getOtpSettings(),
    getProviderSettings(),
    fetchBalances(),
    hiddenCount(),
  ]);
  return {
    ...settings,
    configured: otpProviderConfigured(),
    providers: balances.map((b) => ({ ...b, enabled: providerSettings[b.provider] })),
    minSuccessRate: providerSettings.minSuccessRate,
    hiddenApps,
  };
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await state());
}

// DELETE — show every sold-out app again.
export async function DELETE() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await clearOutOfStock();
  return NextResponse.json({ ok: true, hiddenApps: 0 });
}

// PUT { enabled?, markupPercent?, grizzly?, smspool?, minSuccessRate? }
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const markup = body?.markupPercent === undefined ? undefined : Number(body.markupPercent);
  if (markup !== undefined && (!Number.isFinite(markup) || markup < 0 || markup > 1000)) {
    return NextResponse.json({ error: "Markup must be between 0% and 1000%." }, { status: 400 });
  }
  const minSuccess = body?.minSuccessRate === undefined ? undefined : Number(body.minSuccessRate);
  if (minSuccess !== undefined && (!Number.isFinite(minSuccess) || minSuccess < 0 || minSuccess > 100)) {
    return NextResponse.json({ error: "Minimum success rate must be between 0% and 100%." }, { status: 400 });
  }
  const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
  await Promise.all([
    setOtpSettings({ enabled: bool(body?.enabled), markupPercent: markup }),
    setProviderSettings({ grizzly: bool(body?.grizzly), smspool: bool(body?.smspool), minSuccessRate: minSuccess }),
  ]);
  return NextResponse.json({ ok: true, ...(await state()) });
}
