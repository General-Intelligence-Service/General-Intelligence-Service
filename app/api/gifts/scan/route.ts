import { NextRequest, NextResponse } from "next/server";
import { processScan, isPostgresConfigured } from "@/lib/gift-scan-db";

export async function POST(request: NextRequest) {
  try {
    const configured = isPostgresConfigured();
    if (!configured) {
      return NextResponse.json(
        {
          status: "error",
          error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel (Storage).",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const qrCode = typeof body?.qr_code === "string" ? body.qr_code.trim() : "";
    const action = body?.action === "add" ? "add" : "deduct";
    const quantity = Math.max(1, Math.floor(Number(body?.quantity) || 1));

    if (!qrCode) {
      return NextResponse.json(
        { status: "error", error: "qr_code مطلوب" },
        { status: 400 }
      );
    }

    const result = await processScan(qrCode, { action, quantity });

    if (!result) {
      return NextResponse.json(
        {
          status: "error",
          error: "رمز QR غير موجود في النظام",
          scanned_value: qrCode,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("POST /api/gifts/scan:", e);
    return NextResponse.json(
      {
        status: "error",
        error: "حدث خطأ في الخادم",
      },
      { status: 500 }
    );
  }
}
