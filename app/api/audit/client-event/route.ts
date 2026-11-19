import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth-session";
import { withNoStore } from "@/lib/security-headers";
import { auditRequestMeta, writeAuditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** أحداث تُنفَّذ من الواجهة (Excel / نسخ احتياطي / طلبات محلية) */
const ALLOWED = new Set([
  "data.export_excel",
  "data.import_excel",
  "data.backup_download",
  "data.backup_restore",
  "order.update",
  "order.delete",
  "upload.delete",
]);

const schema = z.object({
  action: z.string().trim().min(1).max(128),
  targetType: z.string().trim().max(64).optional(),
  targetId: z.string().trim().max(255).optional(),
  targetLabel: z.string().trim().max(512).optional(),
  result: z.enum(["success", "failure"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول" },
        withNoStore({ status: 401 })
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success || !ALLOWED.has(parsed.data.action)) {
      return NextResponse.json(
        { success: false, error: "حدث غير مسموح" },
        withNoStore({ status: 400 })
      );
    }

    const meta = auditRequestMeta(request);
    await writeAuditLog({
      actorEmail: session.email,
      action: parsed.data.action,
      targetType: parsed.data.targetType ?? null,
      targetId: parsed.data.targetId ?? null,
      targetLabel: parsed.data.targetLabel ?? null,
      ip: meta.ip,
      userAgent: meta.userAgent,
      result: parsed.data.result ?? "success",
    });

    return NextResponse.json({ success: true }, withNoStore({ status: 200 }));
  } catch (e) {
    console.error("POST /api/audit/client-event:", e);
    return NextResponse.json(
      { success: false, error: "فشل تسجيل الحدث" },
      withNoStore({ status: 500 })
    );
  }
}
