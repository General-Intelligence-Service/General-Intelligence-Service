import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth-session";
import {
  getAdminSecurity,
  setLastTotpStep,
  updateBackupCodeHashes,
} from "@/lib/admin-security-db";
import {
  decryptSecret,
  generateBackupCodes,
  verifyTotpCode,
} from "@/lib/totp";
import { withNoStore } from "@/lib/security-headers";
import { auditRequestMeta, writeAuditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(request: NextRequest) {
  const meta = auditRequestMeta(request);
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
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "أدخل رمزاً من 6 أرقام" },
        withNoStore({ status: 400 })
      );
    }

    const row = await getAdminSecurity(session.email);
    if (!row?.totpEnabled || !row.totpSecretEnc) {
      return NextResponse.json(
        { success: false, error: "التحقق الثنائي غير مفعّل" },
        withNoStore({ status: 400 })
      );
    }

    const plain = decryptSecret(row.totpSecretEnc);
    const result = verifyTotpCode(plain, parsed.data.code, row.lastTotpStep);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: "رمز التحقق غير صحيح" },
        withNoStore({ status: 401 })
      );
    }

    await setLastTotpStep(session.email, result.timeStep);
    const { plain: backupPlain, hashes } = await generateBackupCodes();
    await updateBackupCodeHashes(session.email, hashes);

    await writeAuditLog({
      actorEmail: session.email,
      action: "auth.2fa_backup_regenerated",
      ip: meta.ip,
      userAgent: meta.userAgent,
      result: "success",
    });

    return NextResponse.json(
      { success: true, data: { backupCodes: backupPlain } },
      withNoStore({ status: 200 })
    );
  } catch (error) {
    console.error("2fa regenerate-backup:", error);
    return NextResponse.json(
      { success: false, error: "تعذر إعادة توليد الرموز" },
      withNoStore({ status: 500 })
    );
  }
}
