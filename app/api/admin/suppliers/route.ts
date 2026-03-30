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

async function getShopViaCloneBalance(): Promise<string> {
  const apiKey = process.env.SUPPLIER_SHOPVIACLONE_API_KEY?.trim();
  if (!apiKey) return "N/A";
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
    if (balance != null) {
      const num = parseFloat(String(balance));
      return Number.isFinite(num) ? `$${num.toFixed(2)}` : String(balance);
    }
    return "N/A";
  } catch {
    return "N/A";
  }
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suppliers = await db.select().from(supplier).orderBy(supplier.name);

  // Fetch balances in parallel
  const [sociallyBalance, svcBalance] = await Promise.all([
    (async () => {
      if (!process.env.SOCIALLY_API_KEY?.trim()) return null;
      try { return await getSociallyBalance(); } catch { return { balance: "N/A", currency: "NGN" }; }
    })(),
    getShopViaCloneBalance(),
  ]);

  const rows = suppliers.map((s: any) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    status: s.status,
    balance: s.slug === "shopviaclone" ? svcBalance : "N/A",
  }));

  if (sociallyBalance) {
    rows.unshift({
      id: "boosting-socially",
      name: "Socially.ng (Boosting)",
      slug: "socially",
      status: "active",
      balance: `${sociallyBalance.balance} ${sociallyBalance.currency}`,
    });
  }

  return NextResponse.json(rows);
}
