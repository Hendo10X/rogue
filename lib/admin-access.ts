import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/utils/auth";
import { db } from "@/db/drizzle";
import { admin } from "@/db/schema";
import { createAdminSession, hashPassword } from "@/lib/admin-auth";
import { isAdminEmail } from "@/lib/admin-emails";

export { isAdminEmail };

/** The current storefront session and whether its email is an admin. */
export async function getSessionWithAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  return { session, isAdmin: await isAdminEmail(session?.user?.email) };
}

/**
 * Open an Ozymandias session for an admin email. The admin row is keyed by the
 * email (its password hash is random and never used), so the existing
 * `admin_session` cookie — which every /api/admin route already checks — keeps
 * working unchanged.
 */
export async function createAdminSessionForEmail(email: string): Promise<string> {
  const username = email.trim().toLowerCase();
  const [existing] = await db
    .select({ id: admin.id })
    .from(admin)
    .where(eq(admin.username, username))
    .limit(1);

  let adminId = existing?.id;
  if (!adminId) {
    adminId = crypto.randomUUID();
    await db.insert(admin).values({
      id: adminId,
      username,
      passwordHash: await hashPassword(crypto.randomUUID() + crypto.randomUUID()),
    });
  }
  return createAdminSession(adminId);
}
