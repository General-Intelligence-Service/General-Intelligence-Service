import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  getSession,
  setSessionCookie,
} from "@/lib/auth-session";
import {
  enableTotp,
  getAdminSecurity,
} from "@/lib/admin-security-db";
import {
  decryptSecret,
  generateBackupCodes,
  verifyTotpForSetup,
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
    if (!row?.pendingSecretEnc) {
      return NextResponse.json(
        { success: false, error: "ابدأ التفعيل أولاً لعرض رمز QR" },
        withNoStore({ status: 400 })
      );
    }
    if (row.totpEnabled) {
      return NextResponse.json(
        { success: false, error: "التحقق الثنائي مفعّل مسبقاً" },
        withNoStore({ status: 400 })
      );
    }

    const plain = decryptSecret(row.pendingSecretEnc);
    if (!verifyTotpForSetup(plain, parsed.data.code)) {
      return NextResponse.json(
        { success: false, error: "رمز التحقق غير صحيح" },
        withNoStore({ status: 400 })
      );
    }

    const { plain: backupPlain, hashes } = await generateBackupCodes();
    await enableTotp(session.email, row.pendingSecretEnc, hashes);

    // حدّث الجلسة لتعكس totpEnabled
    const token = await createSessionToken(session.email, { totpEnabled: true });
    await setSessionCookie(token);

    await writeAuditLog({
      actorEmail: session.email,
      action: "auth.2fa_enabled",
      ip: meta.ip,
      userAgent: meta.userAgent,
      result: "success",
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          backupCodes: backupPlain,
        },
      },
      withNoStore({ status: 200 })
    );
  } catch (error) {
    console.error("2fa confirm:", error);
    return NextResponse.json(
      { success: false, error: "تعذر تأكيد التفعيل" },
      withNoStore({ status: 500 })
    );
  }
}
