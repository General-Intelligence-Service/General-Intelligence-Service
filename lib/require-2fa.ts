/** فرض تفعيل 2FA عبر متغير البيئة REQUIRE_2FA=true */

export function isRequire2faEnabled(): boolean {
  const v = (process.env.REQUIRE_2FA ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function isSecuritySetupPath(pathname: string): boolean {
  return (
    pathname === "/dashboard/security" ||
    pathname.startsWith("/dashboard/security/") ||
    pathname.startsWith("/api/auth/2fa/") ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/session"
  );
}
