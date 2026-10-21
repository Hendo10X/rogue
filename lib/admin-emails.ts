/**
 * Who may open Ozymandias. Access follows the signed-in Rogue account's email
 * (like Western Socials) — there is no separate admin password any more.
 * `ADMIN_EMAILS` (comma-separated) on the host adds more without a deploy.
 */
const OWNER_EMAILS = ["hendersondike@gmail.com", "vinseven8@gmail.com"];

export function adminEmails(): string[] {
  const extra = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...OWNER_EMAILS, ...extra]));
}

export function isAdminEmail(email?: string | null): boolean {
  return !!email && adminEmails().includes(email.trim().toLowerCase());
}
