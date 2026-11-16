import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const res = NextResponse.next();
  const noStore =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/trips") ||
    pathname.startsWith("/api/warehouse") ||
    pathname.startsWith("/api/gift-movements") ||
    pathname.startsWith("/api/today-gifts");
  if (noStore) {
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    res.headers.set("Pragma", "no-cache");
  }
  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/auth/:path*",
    "/api/upload",
    "/api/trips/:path*",
    "/api/warehouse",
    "/api/gift-movements",
    "/api/today-gifts",
  ],
};
