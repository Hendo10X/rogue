import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { user, wallet } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

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
        createdAt: user.createdAt,
        balance: wallet.balance,
      })
      .from(user)
      .leftJoin(
        wallet,
        and(eq(user.id, wallet.userId), eq(wallet.currency, "NGN"))
      )
      .orderBy(desc(user.createdAt));

    const output = users.map((u: { id: string; name: string; email: string; createdAt: Date | null; balance: string | null }) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      balance: u.balance ?? "0",
    }));

    return NextResponse.json(output);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
