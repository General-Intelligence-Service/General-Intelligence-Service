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

    if (!email || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "البريد وكلمة المرور مطلوبان" },
        { status: 400 }
      );
    }

    if (!isAllowedEmail(email)) {
      return NextResponse.json(
        { success: false, error: "هذا البريد غير معتمد للدخول" },
        { status: 403 }
      );
    }

    if (!checkAdminPassword(password)) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const token = createSessionToken(email);
    await setSessionCookie(token);

    return NextResponse.json({ success: true, redirect: "/dashboard" });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تسجيل الدخول" },
      { status: 500 }
    );
  }
}
