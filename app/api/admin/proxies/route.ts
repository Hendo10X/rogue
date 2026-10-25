import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-route";
import { getProxySettings, setProxySettings } from "@/lib/proxies/settings";
import { fetchProviderBalance, proxyProviderConfigured } from "@/lib/proxies/provider";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const configured = proxyProviderConfigured();
  let balanceUsd: number | null = null;
  let providerError: string | null = null;
  if (configured) {
    try {
      balanceUsd = await fetchProviderBalance();
    } catch (err) {
      providerError = err instanceof Error ? err.message : "Couldn't reach proxy-seller";
    }
  }
  return NextResponse.json({ ...(await getProxySettings()), configured, balanceUsd, providerError });
}

// PUT { enabled?, markupPercent? }
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { enabled?: unknown; markupPercent?: unknown } | null;
  const markup = body?.markupPercent === undefined ? undefined : Number(body.markupPercent);
  if (markup !== undefined && (!Number.isFinite(markup) || markup < 0 || markup > 500)) {
    return NextResponse.json({ error: "Markup must be between 0% and 500%." }, { status: 400 });
  }
  await setProxySettings({
    enabled: typeof body?.enabled === "boolean" ? body.enabled : undefined,
    markupPercent: markup,
  });
  return NextResponse.json({ ok: true, ...(await getProxySettings()) });
}
