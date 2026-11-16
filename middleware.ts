import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-token";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-login-path";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = ADMIN_LOGIN_PATH;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const res = NextResponse.next();
  const noStore =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith(ADMIN_LOGIN_PATH) ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/trips") ||
    pathname.startsWith("/api/warehouse") ||
    pathname.startsWith("/api/gift-movements") ||
    pathname.startsWith("/api/today-gifts");
  if (noStore) {
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    res.headers.set("Pragma", "no-cache");
  }

  if (pathname.startsWith(ADMIN_LOGIN_PATH)) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/gis-admin",
    "/gis-admin/:path*",
    "/api/auth/:path*",
    "/api/upload",
    "/api/trips/:path*",
    "/api/warehouse",
    "/api/gift-movements",
    "/api/today-gifts",
  ],
};
