import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth-session";
import { auditRequestMeta, writeAuditLog } from "@/lib/audit-log";
import { detectImageKind, extensionForKind, mimeForKind } from "@/lib/image-magic";
import { withNoStore } from "@/lib/security-headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول" },
        withNoStore({ status: 401 })
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "لم يتم اختيار ملف" },
        withNoStore({ status: 400 })
      );
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: "حجم الملف غير مقبول. الحد الأقصى 5MB" },
        withNoStore({ status: 400 })
      );
    }

    const declared = (file.type || "").toLowerCase();
    if (declared && !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(declared)) {
      return NextResponse.json(
        { success: false, error: "نوع الملف غير مدعوم. يُقبل JPEG و PNG و WEBP فقط" },
        withNoStore({ status: 400 })
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const kind = detectImageKind(bytes);
    if (!kind) {
      return NextResponse.json(
        { success: false, error: "الملف ليس صورة صالحة (JPEG/PNG/WEBP)" },
        withNoStore({ status: 400 })
      );
    }

    const ext = extensionForKind(kind);
    const fileName = `${Date.now()}-${randomBytes(16).toString("hex")}.${ext}`;
    const mime = mimeForKind(kind);

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`product-uploads/${fileName}`, bytes, {
        access: "public",
        addRandomSuffix: false,
        contentType: mime,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      await writeAuditLog({
        actorEmail: session.email,
        action: "upload.image",
        targetType: "صورة",
        targetId: fileName,
        targetLabel: file.name.slice(0, 200),
        ...auditRequestMeta(request),
        result: "success",
      });
      return NextResponse.json(
        { success: true, message: "تم رفع الصورة بنجاح", url: blob.url },
        withNoStore({ status: 200 })
      );
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          success: false,
          error:
            "رفع الصور على الاستضافة يحتاج Vercel Blob: من لوحة Vercel → Storage → Blob → ربط BLOB_READ_WRITE_TOKEN.",
        },
        withNoStore({ status: 503 })
      );
    }

    const imagesDir = path.join(process.cwd(), "public", "images");
    if (!existsSync(imagesDir)) {
      await mkdir(imagesDir, { recursive: true });
    }
    await writeFile(path.join(imagesDir, fileName), bytes);
    await writeAuditLog({
      actorEmail: session.email,
      action: "upload.image",
      targetType: "صورة",
      targetId: fileName,
      targetLabel: file.name.slice(0, 200),
      ...auditRequestMeta(request),
      result: "success",
    });

    return NextResponse.json(
      { success: true, message: "تم رفع الصورة بنجاح", url: `/images/${fileName}` },
      withNoStore({ status: 200 })
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, error: "فشل في رفع الصورة" },
      withNoStore({ status: 500 })
    );
  }
}
