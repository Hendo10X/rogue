import { asc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { adminEmail } from "@/db/schema";

/**
 * Who may open Ozymandias. Access follows the signed-in Rogue account's email
 * (like Western Socials) — there is no separate admin password.
 *
 * - Owners are built in (plus any in the `ADMIN_EMAILS` env var). They always
 *   have access, can't be removed from the panel, and aren't listed in it.
 * - Everyone else is added or removed by an admin in Ozymandias → Settings
 *   and stored in the `admin_email` table.
 */
const OWNER_EMAILS = ["hendersondike@gmail.com", "vinseven8@gmail.com"];

function normalize(email: string) {
  return email.trim().toLowerCase();
}

export function ownerEmails(): string[] {
  const extra = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalize)
    .filter(Boolean);
  return Array.from(new Set([...OWNER_EMAILS, ...extra]));
}

export function isOwnerEmail(email?: string | null): boolean {
  return !!email && ownerEmails().includes(normalize(email));
}

/** True for owners and for admins added in the panel. */
export async function isAdminEmail(email?: string | null): Promise<boolean> {
  if (!email) return false;
  if (isOwnerEmail(email)) return true;
  try {
    const [row] = await db
      .select({ email: adminEmail.email })
      .from(adminEmail)
      .where(eq(adminEmail.email, normalize(email)))
      .limit(1);
    return !!row;
  } catch {
    // Table not migrated yet (or a DB blip): owners still get in.
    return false;
  }
}

export type AdminEntry = { email: string; addedBy: string | null; createdAt: string };

/** Admins added in the panel, oldest first. Owners are deliberately omitted. */
export async function listAddedAdmins(): Promise<AdminEntry[]> {
  const owners = new Set(ownerEmails());
  const rows = await db
    .select()
    .from(adminEmail)
    .orderBy(asc(adminEmail.createdAt));
  return rows
    .filter((r: (typeof rows)[number]) => !owners.has(r.email))
    .map((r: (typeof rows)[number]) => ({
      email: r.email,
      addedBy: r.addedBy ?? null,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
}

export async function addAdminEmail(email: string, addedBy: string): Promise<void> {
  await db
    .insert(adminEmail)
    .values({ email: normalize(email), addedBy })
    .onConflictDoNothing();
}

export async function removeAdminEmail(email: string): Promise<void> {
  await db.delete(adminEmail).where(eq(adminEmail.email, normalize(email)));
}
