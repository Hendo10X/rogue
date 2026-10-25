import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { logRequest } from "@/db/schema";

export const dynamic = "force-dynamic";

// GET — counts behind the red dots in the customer sidebar.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ requestReplies: 0 });
  try {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(logRequest)
      .where(and(eq(logRequest.userId, session.user.id), eq(logRequest.customerUnread, true)));
    return NextResponse.json({ requestReplies: n });
  } catch {
    return NextResponse.json({ requestReplies: 0 });
  }
}
