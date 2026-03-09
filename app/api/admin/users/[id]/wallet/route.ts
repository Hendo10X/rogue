import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { wallet, transaction, user } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body: { amount: number; type: "credit" | "debit" } = await req.json();

    if (!body.amount || body.amount <= 0 || !["credit", "debit"].includes(body.type)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Verify user exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let [userWallet] = await db
      .select()
      .from(wallet)
      .where(and(eq(wallet.userId, id), eq(wallet.currency, "NGN")))
      .limit(1);

    if (!userWallet) {
      const walletId = crypto.randomUUID();
      [userWallet] = await db
        .insert(wallet)
        .values({
          id: walletId,
          userId: id,
          currency: "NGN",
          balance: "0",
        })
        .returning();
    }

    const currentBalance = parseFloat(userWallet.balance);
    const amount = body.amount;
    
    if (body.type === "debit" && currentBalance < amount) {
      return NextResponse.json({ error: "Insufficient balance for debit" }, { status: 400 });
    }

    const newBalance =
      body.type === "credit" ? currentBalance + amount : currentBalance - amount;

    await db
      .update(wallet)
      .set({ balance: String(newBalance), updatedAt: new Date() })
      .where(eq(wallet.id, userWallet.id));

    await db.insert(transaction).values({
      id: crypto.randomUUID(),
      walletId: userWallet.id,
      type: "adjustment",
      amount: body.type === "credit" ? String(amount) : `-${amount}`,
      currency: "NGN",
      status: "completed",
      metadata: {
        adminAdjustment: true,
        action: body.type,
        previousBalance: currentBalance,
        newBalance: newBalance,
        adminId: admin.id,
      },
    });

    return NextResponse.json({ ok: true, newBalance: String(newBalance) });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to process adjustment" },
      { status: 500 }
    );
  }
}
