import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { userSuspension } from "@/db/schema";

/** Shown wherever a suspended user tries to buy, deposit or use the API. */
export const SUSPENDED_MESSAGE =
  "Your account is suspended. Contact support on Telegram if you think this is a mistake.";

/**
 * True when an admin has suspended this account. Any error (e.g. the table
 * isn't migrated yet) counts as not suspended, so this can never lock
 * everyone out.
 */
export async function isUserSuspended(userId: string): Promise<boolean> {
  try {
    const [row] = await db
      .select({ userId: userSuspension.userId })
      .from(userSuspension)
      .where(eq(userSuspension.userId, userId))
      .limit(1);
    return !!row;
  } catch {
    return false;
  }
}

/** For signed-in pages: send suspended users to /suspended. */
export async function redirectIfSuspended(userId: string): Promise<void> {
  if (await isUserSuspended(userId)) redirect("/suspended");
}

export async function getSuspendedUserIds(userIds?: string[]): Promise<Set<string>> {
  try {
    const rows = userIds?.length
      ? await db.select({ userId: userSuspension.userId }).from(userSuspension).where(inArray(userSuspension.userId, userIds))
      : await db.select({ userId: userSuspension.userId }).from(userSuspension);
    return new Set(rows.map((r: { userId: string }) => r.userId));
  } catch {
    return new Set();
  }
}

export async function setUserSuspended(
  userId: string,
  suspended: boolean,
  by: string,
  reason?: string | null
): Promise<void> {
  if (suspended) {
    await db
      .insert(userSuspension)
      .values({ userId, suspendedBy: by, reason: reason?.trim() || null })
      .onConflictDoNothing();
  } else {
    await db.delete(userSuspension).where(eq(userSuspension.userId, userId));
  }
}
