/**
 * مسار صفحة دخول المسؤولين (داخلي فقط — لا يُعرض في الواجهة العامة).
 */
export const ADMIN_LOGIN_PATH = "/gis-admin";

export function adminLoginUrl(next?: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return ADMIN_LOGIN_PATH;
  }
  const params = new URLSearchParams();
  params.set("next", next);
  return `${ADMIN_LOGIN_PATH}?${params.toString()}`;
}
