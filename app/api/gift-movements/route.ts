import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { getMonthlyMovementSummary } from "@/lib/gift-movements-db";
import { isTodayGiftsDbConfigured } from "@/lib/today-gifts-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    if (!isTodayGiftsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }
    const { searchParams } = new URL(request.url);
    const month = String(searchParams.get("month") ?? "").trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ success: false, error: "month مطلوب بصيغة YYYY-MM" }, { status: 400 });
    }
    const summary = await getMonthlyMovementSummary(month);
    return NextResponse.json({ success: true, month, summary });
  } catch (e) {
    console.error("GET /api/gift-movements:", e);
    return NextResponse.json({ success: false, error: "فشل في جلب سجل الحركة" }, { status: 500 });
  }
}

