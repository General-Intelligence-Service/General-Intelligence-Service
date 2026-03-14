import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_API = "https://api.telegram.org";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfBase64, caption } = body as { pdfBase64: string; caption?: string };

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return NextResponse.json(
        { success: false, error: "محتوى PDF مطلوب" },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json(
        { success: false, error: "إرسال تلغرام غير مُعد (TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID)" },
        { status: 503 }
      );
    }

    const buffer = Buffer.from(pdfBase64, "base64");
    const blob = new Blob([buffer], { type: "application/pdf" });
    const formData = new FormData();
    formData.append("chat_id", chatId.trim());
    formData.append("document", blob, "order.pdf");
    if (caption && caption.trim()) {
      formData.append("caption", caption.trim());
    }

    const url = `${TELEGRAM_API}/bot${botToken}/sendDocument`;
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      console.error("Telegram API error:", data);
      return NextResponse.json(
        { success: false, error: data.description || "فشل إرسال الملف إلى تلغرام" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "خطأ في الخادم" },
      { status: 500 }
    );
  }
}
