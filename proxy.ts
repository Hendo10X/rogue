import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/utils/auth";

const ADMIN_PUBLIC = ["/ozymandias/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin route guard
  if (pathname.startsWith("/ozymandias")) {
    if (ADMIN_PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.next();
    }
    const session = request.cookies.get("admin_session")?.value;
    if (!session) {
      return NextResponse.redirect(new URL("/ozymandias/login", request.url));
    }
    return NextResponse.next();
  }

  // Dashboard route guard
  if (pathname.startsWith("/dashboard")) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/ozymandias", "/ozymandias/:path*"],
};
