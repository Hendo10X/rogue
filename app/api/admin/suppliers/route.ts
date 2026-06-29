import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { supplier } from "@/db/schema";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getBalance as getSociallyBalance } from "@/lib/boosting/socially";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

// USD balance below this is flagged "low" in the admin panel.
const LOW_USD_THRESHOLD = 10;

async function getShopViaCloneBalance(): Promise<number | null> {
  const apiKey = process.env.SUPPLIER_SHOPVIACLONE_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const url = `https://shopviaclone22.com/api/balance.php?api_key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const balance =
      data?.balance ??
      data?.data?.balance ??
      data?.wallet ??
      data?.wallet_balance;
    const num = parseFloat(String(balance));
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

// AcctShop exposes the reseller balance via profile.php → data.money (USD).
async function getAcctShopBalance(): Promise<number | null> {
  const apiKey = process.env.SUPPLIER_ACCTSHOP_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const url = `https://acctshop.com/api/profile.php?api_key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const num = parseFloat(String(data?.data?.money ?? data?.money));
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

function usd(n: number | null): string {
  return n == null ? "N/A" : `$${n.toFixed(2)}`;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suppliers = await db.select().from(supplier).orderBy(supplier.name);

  // Fetch balances in parallel
  const [sociallyBalance, svcBalance, acctShopBalance] = await Promise.all([
    (async () => {
      if (!process.env.SOCIALLY_API_KEY?.trim()) return null;
      try { return await getSociallyBalance(); } catch { return { balance: "N/A", currency: "NGN" }; }
    })(),
    getShopViaCloneBalance(),
    getAcctShopBalance(),
  ]);

  const rows = suppliers.map((s: any) => {
    let num: number | null = null;
    if (s.slug === "shopviaclone") num = svcBalance;
    else if (s.slug === "acctshop") num = acctShopBalance;
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      status: s.status,
      balance: usd(num),
      low: num != null && num < LOW_USD_THRESHOLD,
    };
  });

  if (sociallyBalance) {
    const ngn = parseFloat(String(sociallyBalance.balance));
    rows.unshift({
      id: "boosting-socially",
      name: "Socially.ng (Boosting)",
      slug: "socially",
      status: "active",
      balance: `${sociallyBalance.balance} ${sociallyBalance.currency}`,
      low: Number.isFinite(ngn) && ngn < 5000,
    });
  }

  return NextResponse.json(rows);
}
