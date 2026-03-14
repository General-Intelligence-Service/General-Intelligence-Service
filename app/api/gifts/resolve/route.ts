import { NextRequest, NextResponse } from "next/server";
import { resolveGift, isPostgresConfigured } from "@/lib/gift-scan-db";
import { getSession } from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { found: false, error: "يجب تسجيل الدخول" },
        { status: 401 }
      );
    }
    if (!isPostgresConfigured()) {
      return NextResponse.json(
        { found: false, error: "قاعدة البيانات غير مُعدّة." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const qrCode = typeof body?.qr_code === "string" ? body.qr_code.trim() : "";

    if (!qrCode) {
      return NextResponse.json(
        { found: false, error: "qr_code مطلوب" },
        { status: 400 }
      );
    }

    const result = await resolveGift(qrCode);

    if (!result) {
      return NextResponse.json(
        { found: false, scanned_value: qrCode },
        { status: 200 }
      );
    }

    return NextResponse.json({
      found: true,
      gift_name: result.gift_name,
      current_quantity: result.current_quantity,
      sku: result.sku,
    });
  } catch (e) {
    console.error("POST /api/gifts/resolve:", e);
    return NextResponse.json(
      { found: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
