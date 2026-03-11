import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { user, wallet } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        balance: wallet.balance,
        ipAddress: sql<string>`(
          SELECT s.ip_address FROM session s
          WHERE s.user_id = ${user.id}
            AND s.ip_address IS NOT NULL
            AND s.ip_address != ''
          ORDER BY s.created_at DESC LIMIT 1
        )`,
      })
      .from(user)
      .leftJoin(
        wallet,
        and(eq(user.id, wallet.userId), eq(wallet.currency, "NGN"))
      )
      .orderBy(desc(user.createdAt));

    const output = users.map((u: typeof users[number]) => {
      let ip = (u.ipAddress ?? "").trim();
      if (ip.startsWith("::ffff:")) ip = ip.slice(7);
      if (ip === "::1" || ip === "127.0.0.1" || ip === "0:0:0:0:0:0:0:1") ip = "";
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phoneNumber: u.phoneNumber ?? "",
        createdAt: u.createdAt,
        balance: u.balance ?? "0",
        ipAddress: ip,
      };
    });

    return NextResponse.json(output);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
