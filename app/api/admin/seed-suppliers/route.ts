import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { db } from "@/db/drizzle";
import { supplier } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdminSession } from "@/lib/admin-auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

const SUPPLIERS = [
  {
    id: "supplier-shopviaclone",
    name: "ShopViaClone",
    slug: "shopviaclone",
    apiUrl: "https://shopviaclone22.com",
    apiKey: process.env.SUPPLIER_SHOPVIACLONE_API_KEY ?? "",
  },
  {
    id: "supplier-storesm",
    name: "StoreSM",
    slug: "storesm",
    apiUrl: "https://storesm.net",
    apiKey: process.env.SUPPLIER_STORESM_API_KEY ?? "",
  },
];

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inserted: string[] = [];
  const updated: string[] = [];
  for (const s of SUPPLIERS) {
    if (!s.apiKey) continue;
    // Match by slug so a previously-added supplier (e.g. with an old/reset key)
    // gets its URL + key refreshed instead of being skipped.
    const [existing] = await db
      .select()
      .from(supplier)
      .where(eq(supplier.slug, s.slug))
      .limit(1);
    if (existing) {
      await db
        .update(supplier)
        .set({
          name: s.name,
          apiUrl: s.apiUrl,
          apiKey: s.apiKey,
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(supplier.id, existing.id));
      updated.push(s.slug);
    } else {
      await db.insert(supplier).values(s);
      inserted.push(s.slug);
    }
  }

  return NextResponse.json({ inserted, updated });
}
