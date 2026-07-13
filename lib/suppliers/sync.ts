import { db } from "@/db/drizzle";
import { supplier, listing } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchSupplierProducts } from "./adapter";
import { getUSDtoNGNRate } from "../currency";
import { getMarketplacePricing, computeMarketplacePriceNgn } from "../pricing";
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

  const [pricing, rate] = await Promise.all([
    getMarketplacePricing(),
    getUSDtoNGNRate(),
  ]);

  // AcctShop's API reports prices in cents (e.g. 220 = $2.20); ShopViaClone
  // reports plain USD. Normalise everything to USD before pricing.
  const priceScaleToUsd = sup.slug === "acctshop" ? 0.01 : 1;

  const products: SupplierProduct[] = data.categories.flatMap((cat: any) =>
    cat.products.map((p: any) => ({
      ...p,
      categoryId: cat.id,
      categoryName: cat.name,
    }))
  );

  let upserted = 0;
  for (const p of products) {
    const [existing] = await db
      .select({ id: listing.id, metadata: listing.metadata })
      .from(listing)
      .where(
        and(
          eq(listing.supplierId, supplierId),
          eq(listing.externalProductId, p.id)
        )
      )
      .limit(1);

    const supplierPriceUsd = parseFloat(p.price) * priceScaleToUsd;
    const ourPriceNgn = computeMarketplacePriceNgn(supplierPriceUsd, rate, pricing);

    const platform = inferPlatform(p.categoryName || "", p.name);

    const slug = `listing-${supplierId}-${p.id}`;
    const stockVal = Math.max(0, Math.trunc(Number(p.amount) || 0));

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
      stock: stockVal,
      metadata: { min: p.min, max: p.max },
    };

    if (existing) {
      const isHidden =
        (existing.metadata as Record<string, unknown> | null)?.hidden === true;
      // Reactivate when restocked; if still out of stock, leave the current
      // status alone so a manual "hide out-of-stock" survives the next sync.
      // A log the admin switched off (metadata.hidden) stays hidden regardless
      // of stock, and we preserve that flag since payload.metadata would
      // otherwise overwrite it.
      await db
        .update(listing)
        .set({
          ...payload,
          metadata: isHidden
            ? { ...payload.metadata, hidden: true }
            : payload.metadata,
          ...(stockVal > 0 && !isHidden ? { status: "active" as const } : {}),
          updatedAt: new Date(),
        })
        .where(eq(listing.id, existing.id));
    } else {
      const id = crypto.randomUUID();
      await db.insert(listing).values({
        id,
        ...payload,
        status: stockVal > 0 ? "active" : "inactive",
      });
    }
    upserted++;
  }

  return { upserted, total: products.length };
}
