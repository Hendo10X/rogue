import { db } from "@/db/drizzle";
import { admin, adminSession, adminSettings, user, deposit, order, boostingOrder } from "@/db/schema";
import { eq, sql, gte, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function verifyAdminPassword(
  username: string,
  password: string
): Promise<{ id: string; username: string } | null> {
  const [a] = await db
    .select()
    .from(admin)
    .where(eq(admin.username, username))
    .limit(1);
  if (!a) return null;
  const ok = await bcrypt.compare(password, a.passwordHash);
  if (!ok) return null;
  return { id: a.id, username: a.username };
}

export async function createAdminSession(adminId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(adminSession).values({
    id: token,
    adminId,
    expiresAt,
  });
  return token;
}

export async function verifyAdminSession(
  token: string
): Promise<{ id: string; username: string } | null> {
  const [s] = await db
    .select()
    .from(adminSession)
    .where(eq(adminSession.id, token))
    .limit(1);
  if (!s || s.expiresAt < new Date()) return null;
  const [a] = await db
    .select()
    .from(admin)
    .where(eq(admin.id, s.adminId))
    .limit(1);
  if (!a) return null;
  return { id: a.id, username: a.username };
}

export async function deleteAdminSession(token: string): Promise<void> {
  await db.delete(adminSession).where(eq(adminSession.id, token));
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function getAdminByUsername(username: string) {
  const [a] = await db
    .select()
    .from(admin)
    .where(eq(admin.username, username))
    .limit(1);
  return a;
}

export async function createOrUpdateAdmin(
  username: string,
  password: string
): Promise<string> {
  const hash = await hashPassword(password);
  const existing = await getAdminByUsername(username);
  if (existing) {
    await db
      .update(admin)
      .set({ passwordHash: hash, updatedAt: new Date() })
      .where(eq(admin.id, existing.id));
    return existing.id;
  }
  const id = crypto.randomUUID();
  await db.insert(admin).values({ id, username, passwordHash: hash });
  return id;
}

export async function changeAdminPassword(
  adminId: string,
  newPassword: string
): Promise<void> {
  const hash = await hashPassword(newPassword);
  await db
    .update(admin)
    .set({ passwordHash: hash, updatedAt: new Date() })
    .where(eq(admin.id, adminId));
}

export async function getSetting(key: string): Promise<string | null> {
  const [r] = await db
    .select()
    .from(adminSettings)
    .where(eq(adminSettings.key, key))
    .limit(1);
  return r?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(adminSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: adminSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function getAdminStats() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, newUsersWeek, newUsersMonth] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(user),
    db.select({ count: sql<number>`count(*)::int` }).from(user).where(gte(user.createdAt, weekAgo)),
    db.select({ count: sql<number>`count(*)::int` }).from(user).where(gte(user.createdAt, monthAgo)),
  ]);

  // Revenue = sum of completed deposits
  const [weekRevenue, monthRevenue, totalRevenue] = await Promise.all([
    db.select({ sum: sql<string>`coalesce(sum(amount::numeric), 0)::text` }).from(deposit).where(and(eq(deposit.status, "completed"), gte(deposit.createdAt, weekAgo))),
    db.select({ sum: sql<string>`coalesce(sum(amount::numeric), 0)::text` }).from(deposit).where(and(eq(deposit.status, "completed"), gte(deposit.createdAt, monthAgo))),
    db.select({ sum: sql<string>`coalesce(sum(amount::numeric), 0)::text` }).from(deposit).where(eq(deposit.status, "completed")),
  ]);

  // Order counts
  const [weekOrders, monthOrders] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(order).where(gte(order.createdAt, weekAgo)),
    db.select({ count: sql<number>`count(*)::int` }).from(order).where(gte(order.createdAt, monthAgo)),
  ]);
  const [weekBoostOrders, monthBoostOrders] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(boostingOrder).where(gte(boostingOrder.createdAt, weekAgo)),
    db.select({ count: sql<number>`count(*)::int` }).from(boostingOrder).where(gte(boostingOrder.createdAt, monthAgo)),
  ]);

  return {
    userCount: totalUsers[0]?.count ?? 0,
    newUsersWeek: newUsersWeek[0]?.count ?? 0,
    newUsersMonth: newUsersMonth[0]?.count ?? 0,
    revenueWeek: weekRevenue[0]?.sum ?? "0",
    revenueMonth: monthRevenue[0]?.sum ?? "0",
    revenueTotal: totalRevenue[0]?.sum ?? "0",
    ordersWeek: (weekOrders[0]?.count ?? 0) + (weekBoostOrders[0]?.count ?? 0),
    ordersMonth: (monthOrders[0]?.count ?? 0) + (monthBoostOrders[0]?.count ?? 0),
  };
}

export async function getMarkupNaira(
  area: "marketplace" | "boosting"
): Promise<number> {
  const key =
    area === "marketplace" ? "markup_naira_marketplace" : "markup_naira_boosting";
  const val = await getSetting(key);
  const n = val ? parseFloat(val) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function getMarkupPercent(
  area: "marketplace" | "boosting"
): Promise<number> {
  const key =
    area === "marketplace"
      ? "markup_percent_marketplace"
      : "markup_percent_boosting";
  const val = await getSetting(key);
  const n = val ? parseFloat(val) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : 15;
}
