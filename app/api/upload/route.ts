import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getSession } from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول" },
        { status: 401 }
      );
    }
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "لم يتم اختيار ملف" },
        { status: 400 }
      );
    }

    // التحقق من نوع الملف
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "نوع الملف غير مدعوم. يرجى رفع صورة (JPG, PNG, WEBP, GIF)" },
        { status: 400 }
      );
    }

    // التحقق من حجم الملف (10MB كحد أقصى)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "حجم الملف كبير جداً. الحد الأقصى 10MB" },
        { status: 400 }
      );
    }

    // إنشاء مجلد الصور إذا لم يكن موجوداً
    const imagesDir = path.join(process.cwd(), "public", "images");
    if (!existsSync(imagesDir)) {
      await mkdir(imagesDir, { recursive: true });
    }

    // إنشاء اسم فريد للملف
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.\u0600-\u06FF]/g, "-");
    const fileName = `${timestamp}-${originalName}`;
    const filePath = path.join(imagesDir, fileName);

    // حفظ الملف
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // إرجاع مسار الصورة
    const imageUrl = `/images/${fileName}`;

    return NextResponse.json({
      success: true,
      message: "تم رفع الصورة بنجاح",
      url: imageUrl,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, error: "فشل في رفع الصورة" },
      { status: 500 }
    );
  }
}

