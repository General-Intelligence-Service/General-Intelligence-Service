import { NextRequest, NextResponse } from "next/server";
import {
  isAllowedEmail,
  checkAdminPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email as string)?.trim?.();
    const password = body.password;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "البريد الإلكتروني مطلوب" },
        { status: 400 }
      );
    }
    const pass = typeof password === "string" ? password.trim() : "";

    if (!isAllowedEmail(email)) {
      return NextResponse.json(
        { success: false, error: "هذا البريد غير معتمد للدخول" },
        { status: 403 }
      );
    }

    if (!checkAdminPassword(email, pass)) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const token = createSessionToken(email);
    await setSessionCookie(token);

    const nextUrl = typeof body.next === "string" && body.next.startsWith("/") ? body.next : "/dashboard";
    return NextResponse.json({ success: true, redirect: nextUrl });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تسجيل الدخول" },
      { status: 500 }
    );
  }
}
