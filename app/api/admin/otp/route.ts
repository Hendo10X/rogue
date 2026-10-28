import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-route";
import { getOtpSettings, setOtpSettings } from "@/lib/otp/settings";
import { fetchOtpBalance, otpProviderConfigured } from "@/lib/otp/provider";
import { clearOutOfStock, hiddenCount } from "@/lib/otp/stock";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const configured = otpProviderConfigured();
  let balanceUsd: number | null = null;
  let providerError: string | null = null;
  if (configured) {
    try {
      balanceUsd = await fetchOtpBalance();
    } catch (err) {
      providerError = err instanceof Error ? err.message : "Couldn't reach 5sim";
    }
  }
  return NextResponse.json({
    ...(await getOtpSettings()),
    configured,
    balanceUsd,
    providerError,
    hiddenApps: await hiddenCount(),
  });
}

// DELETE — show every sold-out app again.
export async function DELETE() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await clearOutOfStock();
  return NextResponse.json({ ok: true, hiddenApps: 0 });
}

// PUT { enabled?, markupPercent? }
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { enabled?: unknown; markupPercent?: unknown } | null;
  const markup = body?.markupPercent === undefined ? undefined : Number(body.markupPercent);
  if (markup !== undefined && (!Number.isFinite(markup) || markup < 0 || markup > 1000)) {
    return NextResponse.json({ error: "Markup must be between 0% and 1000%." }, { status: 400 });
  }
  await setOtpSettings({ enabled: typeof body?.enabled === "boolean" ? body.enabled : undefined, markupPercent: markup });
  return NextResponse.json({ ok: true, ...(await getOtpSettings()) });
}
