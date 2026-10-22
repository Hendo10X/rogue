import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";
import { fetchServices } from "@/lib/boosting/provider";
import { getHiddenServiceIds, setHiddenServiceIds, setServiceHidden } from "@/lib/boosting/hidden";
import { getBoostingPricer, setServiceProfits } from "@/lib/boosting/profit";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

// GET — list boosting services with an isHidden flag so the admin can switch
// each on/off. Supports ?q= search, ?category=, ?page=, ?limit=, and
// ?hiddenOnly=1 to review what's currently switched off.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.toLowerCase().trim();
  const category = searchParams.get("category");
  const hiddenOnly = searchParams.get("hiddenOnly") === "1";
  // status: all | visible | hidden | custom (has its own profit)
  const status = searchParams.get("status") ?? (hiddenOnly ? "hidden" : "all");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)),
  );
  const offset = (page - 1) * limit;

  const [services, hidden, pricer] = await Promise.all([
    fetchServices().catch(() => []),
    getHiddenServiceIds(),
    getBoostingPricer(),
  ]);

  const categories = Array.from(
    new Set(services.map((s) => s.category)),
  ).sort();

  let items = services.map((s) => ({
    service: s.service,
    name: s.name,
    category: s.category,
    rate: s.rate,
    min: s.min,
    max: s.max,
    isHidden: hidden.has(s.service),
    /** Per-service profit if set, else null (uses the global markup). */
    profit: pricer.profits.get(s.service) ?? null,
    sellRate: pricer.sellRate(s.service, s.rate),
  }));

  if (status === "hidden") items = items.filter((s) => s.isHidden);
  else if (status === "visible") items = items.filter((s) => !s.isHidden);
  else if (status === "custom") items = items.filter((s) => s.profit !== null);
  if (category && category !== "all") {
    items = items.filter((s) => s.category === category);
  }
  if (query) {
    items = items.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query) ||
        String(s.service).includes(query),
    );
  }

  items.sort((a, b) => a.name.localeCompare(b.name));

  const total = items.length;
  const paged = items.slice(offset, offset + limit);

  return NextResponse.json({
    items: paged,
    categories,
    hiddenCount: hidden.size,
    customCount: pricer.profits.size,
    globalMarkup: pricer.globalMarkup,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST — switch a service on/off in the storefront. Body: { serviceId, hidden }.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { serviceId?: number; hidden?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const serviceId = Number(body.serviceId);
  if (!Number.isFinite(serviceId) || serviceId <= 0) {
    return NextResponse.json({ error: "Invalid serviceId" }, { status: 400 });
  }
  if (typeof body.hidden !== "boolean") {
    return NextResponse.json(
      { error: "hidden (boolean) is required" },
      { status: 400 },
    );
  }

  const hiddenIds = await setServiceHidden(serviceId, body.hidden);
  return NextResponse.json({ ok: true, hiddenCount: hiddenIds.length });
}

// PATCH — bulk changes.
//   { ids: number[], hidden: boolean }         show / hide many services
//   { ids: number[], profit: number | null }   set or clear their profit (₦ per 1,000)
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { ids?: unknown; hidden?: unknown; profit?: unknown }
    | null;
  const ids = Array.isArray(body?.ids)
    ? (body!.ids as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  if (ids.length === 0 || ids.length > 1000) {
    return NextResponse.json({ error: "Select between 1 and 1,000 services." }, { status: 400 });
  }

  if (typeof body?.hidden === "boolean") {
    const set = await getHiddenServiceIds();
    for (const id of ids) {
      if (body.hidden) set.add(id);
      else set.delete(id);
    }
    const next = await setHiddenServiceIds(Array.from(set));
    return NextResponse.json({ ok: true, hiddenCount: next.length });
  }

  if (body && "profit" in body) {
    const profit = body.profit === null ? null : Number(body.profit);
    if (profit !== null && (!Number.isFinite(profit) || profit < 0 || profit > 10_000_000)) {
      return NextResponse.json({ error: "Profit must be ₦0 or more." }, { status: 400 });
    }
    const map = await setServiceProfits(ids, profit);
    return NextResponse.json({ ok: true, customCount: map.size });
  }

  return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
}
