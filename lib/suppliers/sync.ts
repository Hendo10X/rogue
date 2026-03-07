import { db } from "@/db/drizzle";
import { supplier, listing } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getMarkupNaira } from "@/lib/admin-auth";
import { fetchSupplierProducts } from "./adapter";
import { getUSDtoNGNRate } from "../currency";
import type { SupplierProduct } from "./types";

function inferPlatform(categoryName: string, productName: string): string {
  const combined = `${categoryName} ${productName}`.toLowerCase();
  if (combined.includes("instagram")) return "instagram";
  if (
    combined.includes("facebook") ||
    combined.includes("faceb00k") ||
    combined.includes("facabook")
  ) {
    if (combined.includes("dating")) return "dating facebook";
    if (combined.includes("marketplace")) return "marketplace facebook";
    if (combined.includes("ads") || combined.includes("bm")) return "ads facebook";
    if (combined.includes("aged") || combined.includes("old")) return "aged facebook";

    const countryMatch = combined.match(/\b(uk|usa|vietnam|philippines|indonesia|thailand|india|brazil|colombia|mexico|nigeria|germany|france|italy|spain|canada|australia)\b/i);
    if (countryMatch) {
      return `${countryMatch[0].toLowerCase()} facebook`;
    }

    if (combined.includes("new")) return "new facebook";
    if (combined.includes("random")) return "random countries facebook";
    return "facebook";
  }
  if (combined.includes("tiktok")) return "tiktok";
  if (combined.includes("twitter") || combined.includes("x.com"))
    return "twitter";
  if (combined.includes("youtube")) return "youtube";
  if (combined.includes("telegram")) return "telegram";
  if (combined.includes("whatsapp")) return "whatsapp";
  if (combined.includes("vpn")) return "vpn";
  const cat = categoryName.toLowerCase();
  if (cat.includes("vpn")) return "vpn";
  if (cat.includes("facebook")) return "facebook";
  if (cat.includes("instagram")) return "instagram";
  return "other";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function syncListingsForSupplier(supplierId: string) {
  const [sup] = await db
    .select()
    .from(supplier)
    .where(eq(supplier.id, supplierId))
    .limit(1);

  if (!sup?.apiUrl || !sup?.apiKey) {
    throw new Error(`Supplier ${supplierId} missing apiUrl or apiKey`);
  }

  const data = await fetchSupplierProducts({
    baseUrl: sup.apiUrl,
    apiKey: sup.apiKey,
  });

  if (data.status !== "success" || !Array.isArray(data.categories)) {
    throw new Error("Invalid supplier response");
  }

  const [markupNaira, rate] = await Promise.all([
    getMarkupNaira("marketplace"),
    getUSDtoNGNRate(),
  ]);

  const products: SupplierProduct[] = data.categories.flatMap((cat: any) =>
    cat.products.map((p: any) => ({
      ...p,
      categoryId: cat.id,
      categoryName: cat.name,
    }))
  );

  // If this is AcctShop, immediately hide all non-IG/TikTok listings first
  if (sup.name.toLowerCase().includes("acctshop")) {
    await db.update(listing)
      .set({ status: "inactive" })
      .where(
        and(
          eq(listing.supplierId, supplierId),
          sql`${listing.platform} NOT IN ('instagram', 'tiktok')`
        )
      );
  }

  let upserted = 0;
  for (const p of products) {
    const [existing] = await db
      .select({ id: listing.id })
      .from(listing)
      .where(
        and(
          eq(listing.supplierId, supplierId),
          eq(listing.externalProductId, p.id)
        )
      )
      .limit(1);

    const supplierPriceUsd = parseFloat(p.price);
    const supplierPriceNgn = supplierPriceUsd * rate;
    const ourPriceNgn = supplierPriceNgn + markupNaira;
    
    const platform = inferPlatform(p.categoryName || "", p.name);

    if (
      sup.name.toLowerCase().includes("acctshop") &&
      platform !== "instagram" &&
      platform !== "tiktok"
    ) {
      continue;
    }

    const slug = `listing-${supplierId}-${p.id}`;

    const payload = {
      supplierId,
      externalProductId: p.id,
      type: "account" as const,
      platform,
      categoryName: p.categoryName || null,
      title: p.name.slice(0, 500),
      description: p.description?.slice(0, 2000) ?? null,
      slug,
      supplierPrice: String(supplierPriceUsd),
      price: String(Math.round(ourPriceNgn)),
      currency: "NGN",
      stock: p.amount ?? 0,
      status: "active" as const,
      metadata: { min: p.min, max: p.max },
    };

    if (existing) {
      await db
        .update(listing)
        .set({
          ...payload,
          updatedAt: new Date(),
        })
        .where(eq(listing.id, existing.id));
    } else {
      const id = crypto.randomUUID();
      await db.insert(listing).values({
        id,
        ...payload,
      });
    }
    upserted++;
  }

  return { upserted, total: products.length };
}
