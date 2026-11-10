import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-route";
import { botMarkup, setBotMarkup } from "@/lib/bot-pricing";
import { getOtpSettings } from "@/lib/otp/settings";
import { getProxySettings } from "@/lib/proxies/settings";
import { DEFAULT_TEXTS, getBotTexts, getSupportUrl, setBotTexts, setSupportUrl, TEXT_LIMIT, type BotTexts } from "@/lib/telegram-bot/settings";

export const dynamic = "force-dynamic";

async function state() {
  const [otp, proxy, otpWeb, proxyWeb, texts, supportUrl] = await Promise.all([
    botMarkup("otp"),
    botMarkup("proxy"),
    getOtpSettings(),
    getProxySettings(),
    getBotTexts(),
    getSupportUrl(),
  ]);
  return {
    prices: {
      otpMarkup: otp,
      proxyMarkup: proxy,
      websiteOtpMarkup: otpWeb.markupPercent,
      websiteProxyMarkup: proxyWeb.markupPercent,
    },
    texts,
    supportUrl,
    defaults: DEFAULT_TEXTS,
    textLimit: TEXT_LIMIT,
  };
}

// GET — the bot's prices and editable messages.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await state());
}

// PUT { otpMarkup?, proxyMarkup?, texts?, supportUrl? } — null/"" markup = same as the website.
export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { otpMarkup?: unknown; proxyMarkup?: unknown; texts?: Partial<BotTexts>; supportUrl?: unknown } | null;

  const parse = (v: unknown): number | null | "invalid" | undefined => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 1000 ? Math.round(n * 100) / 100 : "invalid";
  };
  const otp = parse(body?.otpMarkup);
  const proxy = parse(body?.proxyMarkup);
  if (otp === "invalid" || proxy === "invalid") {
    return NextResponse.json({ error: "Markup must be between 0% and 1000%, or empty for the website's markup." }, { status: 400 });
  }
  if (typeof body?.supportUrl === "string") {
    try {
      await setSupportUrl(body.supportUrl);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid support link" }, { status: 400 });
    }
  }
  await Promise.all([
    otp !== undefined ? setBotMarkup("otp", otp) : null,
    proxy !== undefined ? setBotMarkup("proxy", proxy) : null,
    body?.texts ? setBotTexts(body.texts) : null,
  ]);
  return NextResponse.json(await state());
}
