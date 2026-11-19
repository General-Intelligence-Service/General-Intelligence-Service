import { NextRequest, NextResponse } from "next/server";
import { cleanupOldAuditLogs, isAuditDbConfigured } from "@/lib/audit-log";
import { withNoStore } from "@/lib/security-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * تنظيف سجل النشاط الأقدم من 365 يوماً.
 * يُستدعى أسبوعياً عبر Vercel Cron مع ترويسة Authorization: Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      withNoStore({ status: 401 })
    );
  }

  if (!isAuditDbConfigured()) {
    return NextResponse.json(
      { success: true, deleted: 0, skipped: true },
      withNoStore({ status: 200 })
    );
  }

  try {
    const deleted = await cleanupOldAuditLogs(365);
    return NextResponse.json(
      { success: true, deleted },
      withNoStore({ status: 200 })
    );
  } catch (e) {
    console.error("audit cleanup cron:", e);
    return NextResponse.json(
      { success: false, error: "cleanup failed" },
      withNoStore({ status: 500 })
    );
  }
}
