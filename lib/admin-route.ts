import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";

/** The signed-in admin for an /api/admin route, or null. */
export async function requireAdmin() {
  const token = (await cookies()).get("admin_session")?.value;
  return token ? verifyAdminSession(token) : null;
}
