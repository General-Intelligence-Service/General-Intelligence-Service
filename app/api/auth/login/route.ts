import { NextRequest, NextResponse } from "next/server";
import {
  isAllowedEmail,
  checkAdminPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth-session";
import {
  getClientIp,
  limitLoginByEmail,
  limitLoginByIp,
  retryAfterSeconds,
} from "@/lib/rate-limit";
import { loginSchema } from "@/lib/product-schemas";
import { withNoStore } from "@/lib/security-headers";

export const dynamic = "force-dynamic";

const GENERIC_AUTH_ERROR = "البريد أو كلمة المرور غير صحيحة";

function unauthorized() {
  return NextResponse.json(
    { success: false, error: GENERIC_AUTH_ERROR },
    withNoStore({ status: 401 })
  );
}

function tooMany(reset: number) {
  const retry = retryAfterSeconds(reset);
  return new NextResponse(
    JSON.stringify({ success: false, error: "محاولات كثيرة. حاول لاحقاً." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Retry-After": String(retry),
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const ipLimit = await limitLoginByIp(ip);
    if (!ipLimit.success) {
      return tooMany(ipLimit.reset);
    }

    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      // رسالة موحّدة لتفادي تسريب صحة البريد
      return unauthorized();
    }

    const email = parsed.data.email.trim().toLowerCase();
    const pass = parsed.data.password;

    const emailLimit = await limitLoginByEmail(email);
    if (!emailLimit.success) {
      return tooMany(emailLimit.reset);
    }

    // تحقق موحّد الزمن تقريباً: نفحص الصلاحية وكلمة المرور دائماً بنفس المسار
    const allowed = isAllowedEmail(email);
    const passwordOk = allowed ? await checkAdminPassword(email, pass) : false;

    // مقارنة وهمية لتقريب التوقيت عند بريد غير مسموح
    if (!allowed) {
      await checkAdminPassword(email, pass).catch(() => false);
    }

    if (!allowed || !passwordOk) {
      return unauthorized();
    }

    const token = await createSessionToken(email);
    await setSessionCookie(token);

    const nextUrl =
      typeof parsed.data.next === "string" && parsed.data.next.startsWith("/")
        ? parsed.data.next
        : "/dashboard";

    return NextResponse.json({ success: true, redirect: nextUrl }, withNoStore({ status: 200 }));
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تسجيل الدخول" },
      withNoStore({ status: 500 })
    );
  }
}
