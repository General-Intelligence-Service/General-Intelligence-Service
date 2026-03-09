import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, pdfBase64, subject, orderId } = body as {
      to?: string;
      pdfBase64: string;
      subject?: string;
      orderId?: string;
    };

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return NextResponse.json(
        { success: false, error: "محتوى PDF مطلوب" },
        { status: 400 }
      );
    }

    const emailTo = to || process.env.ORDER_EMAIL_TO || process.env.EMAIL_FROM;
    if (!emailTo) {
      return NextResponse.json(
        { success: false, error: "البريد المستلم غير مُعد (ORDER_EMAIL_TO أو to)" },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });

    const buffer = Buffer.from(pdfBase64, "base64");
    const filename = orderId
      ? `طلبية-هدايا-${orderId}.pdf`
      : `طلبية-هدايا-${new Date().toISOString().split("T")[0]}.pdf`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@localhost",
      to: emailTo,
      subject: subject || "طلبية هدايا - مرفق PDF",
      text: "مرفق طلبية الهدايا بصيغة PDF.",
      attachments: [
        {
          filename,
          content: buffer,
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "تم إرسال البريد",
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { success: false, error: "فشل في إرسال البريد" },
      { status: 500 }
    );
  }
}
