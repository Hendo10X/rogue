import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { supplier } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncListingsForSupplier } from "@/lib/suppliers/sync";

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

  let suppliers = await db.select().from(supplier);

  if (suppliers.length === 0) {
    for (const s of SUPPLIERS) {
      if (!s.apiKey) continue;
      const [existing] = await db
        .select()
        .from(supplier)
        .where(eq(supplier.id, s.id))
        .limit(1);
      if (!existing) {
        await db.insert(supplier).values(s);
      }
    }
    suppliers = await db.select().from(supplier);
  }

  if (suppliers.length === 0) {
    return NextResponse.json(
      {
        error:
          "No suppliers configured. Add SUPPLIER_SHOPVIACLONE_API_KEY and SUPPLIER_ACCTSHOP_API_KEY to .env",
        results: [],
      },
      { status: 400 },
    );
  }

  const results: {
    supplierId: string;
    upserted: number;
    total: number;
    error?: string;
  }[] = [];

  for (const sup of suppliers) {
    try {
      if (!sup.apiUrl || !sup.apiKey) {
        results.push({
          supplierId: sup.id,
          upserted: 0,
          total: 0,
          error: "Missing apiUrl or apiKey",
        });
        continue;
      }
      const r = await syncListingsForSupplier(sup.id);
      results.push({ supplierId: sup.id, ...r });
    } catch (e) {
      results.push({
        supplierId: sup.id,
        upserted: 0,
        total: 0,
        error: e instanceof Error ? e.message : "Sync failed",
      });
    }
  }

  return NextResponse.json({ results });
}
