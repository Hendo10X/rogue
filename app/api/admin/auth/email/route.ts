import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionForEmail, getSessionWithAdmin } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

/**
 * "Switch to admin": if the signed-in Rogue account's email is an admin email,
 * open an Ozymandias session and go to the panel. Anyone else is sent to sign
 * in (or back to their dashboard).
 */
export async function GET(req: NextRequest) {
  const { session, isAdmin } = await getSessionWithAdmin();

  // Coming from the panel URL itself: explain rather than bounce silently.
  const fromPanel = req.nextUrl.searchParams.get("from") === "panel";
  if (!session?.user) {
    return NextResponse.redirect(new URL(fromPanel ? "/ozymandias/login" : "/login", req.url));
  }
  if (!isAdmin) {
    return NextResponse.redirect(new URL(fromPanel ? "/ozymandias/login" : "/dashboard", req.url));
  }

  const token = await createAdminSessionForEmail(session.user.email);
  const res = NextResponse.redirect(new URL("/ozymandias", req.url));
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
