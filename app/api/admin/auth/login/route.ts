import { NextResponse } from "next/server";

/**
 * Username/password admin login is retired: Ozymandias now opens from an
 * allowed email's Rogue account (see /api/admin/auth/email). Kept as a route
 * so old clients get a clear answer instead of a 404.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Password login is disabled. Sign in to Rogue with your admin email instead." },
    { status: 410 }
  );
}
