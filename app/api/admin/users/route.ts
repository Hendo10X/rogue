import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { user, wallet } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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
        walletId: wallet.id,
        balance: wallet.balance,
      })
      .from(user)
      .leftJoin(wallet, eq(user.id, wallet.userId))
      .orderBy(desc(user.createdAt));

    // Consolidate users and format output ensuring NGN is grabbed if multiple exist
    const userMap = new Map();
    for (const u of users) {
      if (!userMap.has(u.id)) {
        userMap.set(u.id, {
          id: u.id,
          name: u.name,
          email: u.email,
          createdAt: u.createdAt,
          balance: "0",
        });
      }
      if (u.balance !== null) {
        // Just take the first balance found for now since we enforce NGN mainly
        userMap.get(u.id).balance = u.balance;
      }
    }

    const output = Array.from(userMap.values());
    return NextResponse.json(output);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
