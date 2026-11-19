import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  checkAdminPassword,
  createSessionToken,
  getSession,
  setSessionCookie,
} from "@/lib/auth-session";
import {
  disableTotp,
  getAdminSecurity,
  setLastTotpStep,
} from "@/lib/admin-security-db";
import { decryptSecret, verifyTotpCode } from "@/lib/totp";
import { withNoStore } from "@/lib/security-headers";
import { auditRequestMeta, writeAuditLog } from "@/lib/audit-log";
import { isRequire2faEnabled } from "@/lib/require-2fa";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  password: z.string().min(1).max(200),
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

    if (isRequire2faEnabled()) {
      return NextResponse.json(
        { success: false, error: "لا يمكن تعطيل التحقق الثنائي لأن REQUIRE_2FA مفعّل" },
        withNoStore({ status: 403 })
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "بيانات غير صالحة" },
        withNoStore({ status: 400 })
      );
    }

    const passwordOk = await checkAdminPassword(session.email, parsed.data.password);
    if (!passwordOk) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور غير صحيحة" },
        withNoStore({ status: 401 })
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
    await disableTotp(session.email);

    const token = await createSessionToken(session.email, { totpEnabled: false });
    await setSessionCookie(token);

    await writeAuditLog({
      actorEmail: session.email,
      action: "auth.2fa_disabled",
      ip: meta.ip,
      userAgent: meta.userAgent,
      result: "success",
    });

    return NextResponse.json({ success: true }, withNoStore({ status: 200 }));
  } catch (error) {
    console.error("2fa disable:", error);
    return NextResponse.json(
      { success: false, error: "تعذر تعطيل التحقق الثنائي" },
      withNoStore({ status: 500 })
    );
  }
}
