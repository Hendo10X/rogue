import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { supplier } from "@/db/schema";
import { syncListingsForSupplier } from "@/lib/suppliers/sync";

export const dynamic = "force-dynamic";
// A full catalogue resync across suppliers can touch a few hundred rows.
export const maxDuration = 60;

/**
 * Automated supplier catalogue refresh. Re-pulls every active supplier's
 * products (price + stock) so the storefront and the public API stop offering
 * items the supplier has since sold out of — which otherwise fail at purchase
 * and get refunded. Without this the only refresh was the manual admin button,
 * so displayed stock could be weeks stale.
 *
 * Unlike the admin sync route this needs no session: it authenticates with a
 * shared secret so a scheduler can call it unattended. Trigger on a schedule
 * (Vercel Cron, cron-job.org, GitHub Actions, …) with the header:
 *   Authorization: Bearer <CRON_SECRET>
 * Vercel Cron sends exactly this header automatically when CRON_SECRET is set.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on the server." },
      { status: 500 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suppliers = await db.select().from(supplier);

  const results: {
    supplierId: string;
    ok: boolean;
    upserted?: number;
    total?: number;
    deactivated?: number;
    skipped?: string;
    error?: string;
  }[] = [];

  for (const sup of suppliers) {
    // Deactivated suppliers are skipped, not synced — a re-sync would undo
    // "Deactivate listings" and put them back on the storefront.
    if (sup.status !== "active") {
      results.push({ supplierId: sup.id, ok: true, skipped: "Supplier is inactive" });
      continue;
    }
    if (!sup.apiUrl || !sup.apiKey || sup.apiUrl.startsWith("manual")) {
      results.push({ supplierId: sup.id, ok: true, skipped: "Not an API supplier" });
      continue;
    }
    try {
      const r = await syncListingsForSupplier(sup.id);
      results.push({ supplierId: sup.id, ok: true, ...r });
    } catch (e) {
      // One supplier failing must not stop the others from refreshing.
      results.push({
        supplierId: sup.id,
        ok: false,
        error: e instanceof Error ? e.message : "Sync failed",
      });
    }
  }

  const anyFailed = results.some((r) => !r.ok);
  return NextResponse.json(
    { results, syncedAt: new Date().toISOString() },
    // 207 (still 2xx, so schedulers don't flag it) when a supplier failed.
    { status: anyFailed ? 207 : 200 },
  );
}
