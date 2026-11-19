import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { withNoStore } from "@/lib/security-headers";
import {
  auditRequestMeta,
  isAuditDbConfigured,
  queryAuditLogs,
  writeAuditLog,
  type AuditResult,
} from "@/lib/audit-log";
import { auditActionLabel, formatAuditTime } from "@/lib/audit-labels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function csvEscape(v: string): string {
  const s = v.replace(/"/g, '""');
  return `"${s}"`;
}

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
      page: 1,
      pageSize: 5000,
    });

    const header = [
      "الوقت",
      "المستخدم",
      "العملية",
      "رمز العملية",
      "النوع",
      "المعرّف",
      "الهدف",
      "النتيجة",
      "IP",
    ];
    const lines = [header.map(csvEscape).join(",")];
    for (const row of data.rows) {
      lines.push(
        [
          formatAuditTime(row.timestamp),
          row.actorEmail,
          auditActionLabel(row.action),
          row.action,
          row.targetType ?? "",
          row.targetId ?? "",
          row.targetLabel ?? "",
          row.result === "success" ? "نجاح" : "فشل",
          row.ip ?? "",
        ]
          .map((c) => csvEscape(String(c)))
          .join(",")
      );
    }

    const meta = auditRequestMeta(request);
    await writeAuditLog({
      actorEmail: session.email,
      action: "data.audit_export_csv",
      targetType: "audit",
      targetLabel: `${data.rows.length} سجل`,
      ip: meta.ip,
      userAgent: meta.userAgent,
      result: "success",
    });

    const bom = "\uFEFF";
    return new NextResponse(bom + lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("GET /api/audit/export:", e);
    return NextResponse.json(
      { success: false, error: "فشل تصدير السجل" },
      withNoStore({ status: 500 })
    );
  }
}
