import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import {
  createOneTimeShareLink,
  isProductShareConfigured,
} from "@/lib/product-share-db";

function originFromRequest(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

/** إنشاء رابط مشاركة لمرة واحدة (لوحة التحكم فقط) */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول" },
        { status: 401 }
      );
    }
    if (!isProductShareConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة" },
        { status: 503 }
      );
    }
    const body = await request.json();
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const expiresInHours =
      typeof body.expiresInHours === "number" && Number.isFinite(body.expiresInHours)
        ? body.expiresInHours
        : 72;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "معرف المنتج مطلوب" },
        { status: 400 }
      );
    }
    const r = await createOneTimeShareLink(slug, expiresInHours);
    if (!r.ok) {
      return NextResponse.json({ success: false, error: r.error }, { status: 400 });
    }
    const origin = originFromRequest(request);
    const path = `/share/${encodeURIComponent(r.token)}`;
    const url = origin ? `${origin}${path}` : path;
    return NextResponse.json({
      success: true,
      token: r.token,
      expiresAt: r.expiresAt,
      path,
      url,
    });
  } catch (e) {
    console.error("POST /api/product-share:", e);
    return NextResponse.json(
      { success: false, error: "فشل إنشاء الرابط" },
      { status: 500 }
    );
  }
}
