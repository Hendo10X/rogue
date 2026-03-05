import { db } from "@/db/drizzle";
import { supplier, listing } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getMarkupPercent } from "@/lib/admin-auth";
import { fetchSupplierProducts } from "./adapter";
import { applyMarkupToString } from "./markup";
import type { SupplierProduct } from "./types";

function inferPlatform(categoryName: string, productName: string): string {
  const combined = `${categoryName} ${productName}`.toLowerCase();
  if (combined.includes("instagram")) return "instagram";
  if (
    combined.includes("facebook") ||
    combined.includes("faceb00k") ||
    combined.includes("facabook")
  )
    return "facebook";
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

  const markupPercent = await getMarkupPercent("marketplace");

  const products: Array<SupplierProduct & { categoryName: string }> = [];
  for (const cat of data.categories) {
    if (Array.isArray(cat.products)) {
      for (const p of cat.products) {
        products.push({ ...p, categoryName: cat.name });
      }
    }
  }

  let upserted = 0;
  for (const p of products) {
    const supplierPrice = p.price;
    const ourPrice = applyMarkupToString(supplierPrice, markupPercent);
    const platform = inferPlatform(p.categoryName, p.name);
    const slug = `listing-${supplierId}-${p.id}`;

    const [existing] = await db
      .select()
      .from(listing)
      .where(
        and(
          eq(listing.supplierId, supplierId),
          eq(listing.externalProductId, p.id),
        ),
      )
      .limit(1);

    const payload = {
      supplierId,
      externalProductId: p.id,
      type: "account" as const,
      platform,
      categoryName: p.categoryName,
      title: p.name.slice(0, 500),
      description: p.description?.slice(0, 2000) ?? null,
      slug,
      supplierPrice,
      price: ourPrice,
      currency: "USD",
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
