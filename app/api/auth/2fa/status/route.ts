import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { getAdminSecurity, isSecurityDbConfigured } from "@/lib/admin-security-db";
import { withNoStore } from "@/lib/security-headers";
import { isRequire2faEnabled } from "@/lib/require-2fa";
import { isTotpEncryptionConfigured } from "@/lib/totp-crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "يجب تسجيل الدخول" },
      withNoStore({ status: 401 })
    );
  }

  if (!isSecurityDbConfigured()) {
    return NextResponse.json(
      {
        success: true,
        data: {
          enabled: false,
          backupCodesRemaining: 0,
          require2fa: isRequire2faEnabled(),
          dbReady: false,
          encryptionReady: isTotpEncryptionConfigured(),
        },
      },
      withNoStore({ status: 200 })
    );
  }

  const row = await getAdminSecurity(session.email);
  return NextResponse.json(
    {
      success: true,
      data: {
        enabled: Boolean(row?.totpEnabled),
        backupCodesRemaining: row?.backupCodeHashes?.length ?? 0,
        require2fa: isRequire2faEnabled(),
        dbReady: true,
        encryptionReady: isTotpEncryptionConfigured(),
      },
    },
    withNoStore({ status: 200 })
  );
}
