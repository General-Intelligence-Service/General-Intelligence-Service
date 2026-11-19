import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { withNoStore } from "@/lib/security-headers";
import {
  countFailedLoginsLast24h,
  getLastSuccessfulLogin,
  isAuditDbConfigured,
} from "@/lib/audit-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول" },
        withNoStore({ status: 401 })
      );
    }
    if (!isAuditDbConfigured()) {
      return NextResponse.json(
        {
          success: true,
          data: { lastLogin: null, failedLast24h: 0, dbReady: false },
        },
        withNoStore({ status: 200 })
      );
    }

    const [lastLogin, failedLast24h] = await Promise.all([
      getLastSuccessfulLogin(session.email),
      countFailedLoginsLast24h(),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: { lastLogin, failedLast24h, dbReady: true },
      },
      withNoStore({ status: 200 })
    );
  } catch (e) {
    console.error("GET /api/audit/summary:", e);
    return NextResponse.json(
      { success: false, error: "فشل جلب الملخص" },
      withNoStore({ status: 500 })
    );
  }
}
