import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { withNoStore } from "@/lib/security-headers";
import {
  isAuditDbConfigured,
  queryAuditLogs,
  type AuditResult,
} from "@/lib/audit-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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
        { success: false, error: "قاعدة البيانات غير مُعدّة" },
        withNoStore({ status: 503 })
      );
    }

    const sp = request.nextUrl.searchParams;
    const resultParam = sp.get("result") ?? "";
    const result =
      resultParam === "success" || resultParam === "failure"
        ? (resultParam as AuditResult)
        : "";

    const data = await queryAuditLogs({
      actorEmail: sp.get("actor") ?? "",
      action: sp.get("action") ?? "",
      result,
      q: sp.get("q") ?? "",
      from: sp.get("from") ?? "",
      to: sp.get("to") ?? "",
      page: Number(sp.get("page") ?? 1) || 1,
      pageSize: Number(sp.get("pageSize") ?? 50) || 50,
    });

    return NextResponse.json({ success: true, ...data }, withNoStore({ status: 200 }));
  } catch (e) {
    console.error("GET /api/audit:", e);
    return NextResponse.json(
      { success: false, error: "فشل جلب سجل النشاط" },
      withNoStore({ status: 500 })
    );
  }
}
