import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import {
  getAdminSecurity,
  upsertPendingSecret,
} from "@/lib/admin-security-db";
import {
  buildTotpUri,
  createTotpSecret,
  encryptSecret,
  generateTotpQrDataUrl,
} from "@/lib/totp";
import { withNoStore } from "@/lib/security-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** يبدأ تفعيل 2FA: يولّد سراً مؤقتاً + QR (على الخادم) */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول" },
        withNoStore({ status: 401 })
      );
    }

    const existing = await getAdminSecurity(session.email);
    if (existing?.totpEnabled) {
      return NextResponse.json(
        { success: false, error: "التحقق الثنائي مفعّل مسبقاً" },
        withNoStore({ status: 400 })
      );
    }

    const secret = createTotpSecret();
    const enc = encryptSecret(secret);
    await upsertPendingSecret(session.email, enc);

    const uri = buildTotpUri(session.email, secret);
    const qrDataUrl = await generateTotpQrDataUrl(uri);

    return NextResponse.json(
      {
        success: true,
        data: {
          qrDataUrl,
          secret,
          email: session.email,
        },
      },
      withNoStore({ status: 200 })
    );
  } catch (error) {
    console.error("2fa setup:", error);
    return NextResponse.json(
      { success: false, error: "تعذر بدء تفعيل التحقق الثنائي. تحقق من قاعدة البيانات ومفتاح التشفير." },
      withNoStore({ status: 500 })
    );
  }
}
