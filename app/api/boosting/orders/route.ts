import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { boostingOrder } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await db
    .select()
    .from(boostingOrder)
    .where(eq(boostingOrder.userId, session.user.id))
    .orderBy(desc(boostingOrder.createdAt))
    .limit(100);

  return NextResponse.json(orders);
}
