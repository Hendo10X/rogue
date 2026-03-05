import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { supplier } from "@/db/schema";
import { eq } from "drizzle-orm";

const SUPPLIERS = [
  {
    id: "supplier-shopviaclone",
    name: "ShopViaClone",
    slug: "shopviaclone",
    apiUrl: "https://shopviaclone22.com",
    apiKey: process.env.SUPPLIER_SHOPVIACLONE_API_KEY ?? "",
  },
  {
    id: "supplier-acctshop",
    name: "AcctShop",
    slug: "acctshop",
    apiUrl: "https://acctshop.com",
    apiKey: process.env.SUPPLIER_ACCTSHOP_API_KEY ?? "",
  },
];

export async function POST() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inserted: string[] = [];
  for (const s of SUPPLIERS) {
    if (!s.apiKey) continue;
    const [existing] = await db
      .select()
      .from(supplier)
      .where(eq(supplier.id, s.id))
      .limit(1);
    if (!existing) {
      await db.insert(supplier).values(s);
      inserted.push(s.id);
    }
  }

  return NextResponse.json({ inserted });
}
