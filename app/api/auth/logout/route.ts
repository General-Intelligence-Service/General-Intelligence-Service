import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { deleteSessionCookie, getSession } from "@/lib/auth-session";
import { auditRequestMeta, writeAuditLog } from "@/lib/audit-log";
import { withNoStore } from "@/lib/security-headers";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-login-path";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (session) {
    await writeAuditLog({
      actorEmail: session.email,
      action: "auth.logout",
      ...auditRequestMeta(request),
      result: "success",
    });
  }
  await deleteSessionCookie();
  return NextResponse.json(
    { success: true, redirect: ADMIN_LOGIN_PATH },
    withNoStore({ status: 200 })
  );
}
