import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { supplier } from "@/db/schema";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getBalance } from "@/lib/boosting/really-simple-social";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

const BOOSTING_SLUG = "reallysimplesocial";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suppliers = await db.select().from(supplier).orderBy(supplier.name);

  let rssBalance: { balance: string; currency: string } | null = null;
  const hasRssKey = !!process.env.REALLYSIMPLESOCIAL_API_KEY?.trim();
  if (hasRssKey) {
    try {
      rssBalance = await getBalance();
    } catch {
      rssBalance = { balance: "N/A", currency: "USD" };
    }
  }

  const rows = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    status: s.status,
    balance: "N/A",
  }));

  if (hasRssKey && rssBalance) {
    rows.unshift({
      id: "boosting-reallysimplesocial",
      name: "ReallySimpleSocial (Boosting)",
      slug: BOOSTING_SLUG,
      status: "active",
      balance: `${rssBalance.balance} ${rssBalance.currency}`,
    });
  }

  return NextResponse.json(rows);
}
