import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-token";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-login-path";
import { isRequire2faEnabled, isSecuritySetupPath } from "@/lib/require-2fa";

/** مسارات API تُحجب عن حسابات بلا 2FA عند REQUIRE_2FA */
const PROTECTED_API_PREFIXES = [
  "/api/products",
  "/api/trips",
  "/api/warehouse",
  "/api/today-gifts",
  "/api/gift-movements",
  "/api/upload",
  "/api/audit",
];

function stripPublicCors(res: NextResponse, pathname: string) {
  // لا تُرجع CORS عامّاً على صفحات HTML؛ اتركه للـ API فقط إن لزم لاحقاً
  if (!pathname.startsWith("/api/")) {
    res.headers.delete("Access-Control-Allow-Origin");
    res.headers.delete("Access-Control-Allow-Methods");
    res.headers.delete("Access-Control-Allow-Headers");
  }
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/dashboard") && !session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ADMIN_LOGIN_PATH;
    loginUrl.searchParams.set("next", pathname);
    return stripPublicCors(NextResponse.redirect(loginUrl), pathname);
  }

  // إلزام 2FA: الحساب بلا تفعيل لا يصل إلا لصفحة/واجهات الإعداد
  if (
    session &&
    isRequire2faEnabled() &&
    session.totpEnabled !== true &&
    !isSecuritySetupPath(pathname)
  ) {
    if (pathname.startsWith("/dashboard")) {
      const setupUrl = request.nextUrl.clone();
      setupUrl.pathname = "/dashboard/security";
      setupUrl.search = "";
      return stripPublicCors(NextResponse.redirect(setupUrl), pathname);
    }
    if (PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p))) {
      return stripPublicCors(
        NextResponse.json(
          {
            success: false,
            error: "يجب تفعيل التحقق الثنائي أولاً",
            require2fa: true,
          },
          {
            status: 403,
            headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" },
          }
        ),
        pathname
      );
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

  return stripPublicCors(res, pathname);
}

export const config = {
  matcher: [
    /*
     * صفحات + مسارات محمية: نمرّ على معظم الطلبات لإزالة CORS من HTML
     * مع استثناء الأصول الثابتة.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|webmanifest)$).*)",
  ],
};
