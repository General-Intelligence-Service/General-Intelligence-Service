import { NextResponse } from "next/server";
import { deleteSessionCookie } from "@/lib/auth-session";
import { withNoStore } from "@/lib/security-headers";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-login-path";

export const dynamic = "force-dynamic";

export async function POST() {
  await deleteSessionCookie();
  return NextResponse.json(
    { success: true, redirect: ADMIN_LOGIN_PATH },
    withNoStore({ status: 200 })
  );
}
