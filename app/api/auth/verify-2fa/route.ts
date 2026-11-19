import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth-session";
import { withNoStore } from "@/lib/security-headers";
import {
  getAdminSecurity,
  setLastTotpStep,
  updateBackupCodeHashes,
} from "@/lib/admin-security-db";
import {
  bumpPending2faAttempts,
  deletePending2faCookie,
  getPending2faFromCookies,
  PENDING_2FA_MAX_ATTEMPTS,
} from "@/lib/pending-2fa";
import {
  consumeBackupCode,
  decryptSecret,
  verifyTotpCode,
} from "@/lib/totp";
import { auditRequestMeta, writeAuditLog } from "@/lib/audit-log";
import { isRequire2faEnabled } from "@/lib/require-2fa";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(64),
  useBackup: z.boolean().optional().default(false),
  next: z.string().startsWith("/").max(500).optional(),
});

const INVALID = "رمز التحقق غير صحيح";

export async function POST(request: NextRequest) {
  const meta = auditRequestMeta(request);
  try {
    const pending = await getPending2faFromCookies();
    if (!pending) {
      return NextResponse.json(
        { success: false, error: "انتهت صلاحية التحقق. سجّل الدخول مجدداً.", reset: true },
        withNoStore({ status: 401 })
      );
    }

    if (pending.attempts >= PENDING_2FA_MAX_ATTEMPTS) {
      await deletePending2faCookie();
      return NextResponse.json(
        { success: false, error: "محاولات كثيرة. سجّل الدخول مجدداً.", reset: true },
        withNoStore({ status: 401 })
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: INVALID },
        withNoStore({ status: 400 })
      );
    }

    const security = await getAdminSecurity(pending.email);
    if (!security?.totpEnabled || !security.totpSecretEnc) {
      await deletePending2faCookie();
      return NextResponse.json(
        { success: false, error: "التحقق الثنائي غير مفعّل.", reset: true },
        withNoStore({ status: 400 })
      );
    }

    const useBackup = Boolean(parsed.data.useBackup);
    let ok = false;
    let usedBackup = false;

    if (useBackup) {
      const consumed = await consumeBackupCode(
        security.backupCodeHashes,
        parsed.data.code
      );
      if (consumed.ok) {
        await updateBackupCodeHashes(pending.email, consumed.remainingHashes);
        ok = true;
        usedBackup = true;
      }
    } else {
      const plain = decryptSecret(security.totpSecretEnc);
      const result = verifyTotpCode(plain, parsed.data.code, security.lastTotpStep);
      if (result.ok) {
        await setLastTotpStep(pending.email, result.timeStep);
        ok = true;
      }
    }

    if (!ok) {
      const bump = await bumpPending2faAttempts(pending);
      await writeAuditLog({
        actorEmail: pending.email,
        action: "auth.2fa_failed",
        ip: meta.ip,
        userAgent: meta.userAgent,
        result: "failure",
      });
      if (bump.exhausted) {
        return NextResponse.json(
          {
            success: false,
            error: INVALID,
            reset: true,
          },
          withNoStore({ status: 401 })
        );
      }
      return NextResponse.json(
        { success: false, error: INVALID },
        withNoStore({ status: 401 })
      );
    }

    await deletePending2faCookie();
    const token = await createSessionToken(pending.email, { totpEnabled: true });
    await setSessionCookie(token);

    await writeAuditLog({
      actorEmail: pending.email,
      action: "auth.login_success",
      ip: meta.ip,
      userAgent: meta.userAgent,
      result: "success",
    });
    if (usedBackup) {
      await writeAuditLog({
        actorEmail: pending.email,
        action: "auth.2fa_backup_used",
        ip: meta.ip,
        userAgent: meta.userAgent,
        result: "success",
      });
    }

    const nextUrl =
      typeof parsed.data.next === "string" && parsed.data.next.startsWith("/")
        ? parsed.data.next
        : "/dashboard";

    return NextResponse.json(
      { success: true, redirect: nextUrl },
      withNoStore({ status: 200 })
    );
  } catch (error) {
    console.error("verify-2fa:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء التحقق" },
      withNoStore({ status: 500 })
    );
  }
}
