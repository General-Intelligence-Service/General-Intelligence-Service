import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSession } from "@/lib/auth-session";
import { isProductsDbConfigured, ensureProductsTable, seedProductsIfEmpty } from "@/lib/products-db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    if (!isProductsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }
    const body = (await request.json().catch(() => ({}))) as { category?: unknown };
    const category = typeof body.category === "string" ? body.category.trim() : "";
    if (!category) {
      return NextResponse.json({ success: false, error: "category مطلوب" }, { status: 400 });
    }

    await ensureProductsTable();
    await seedProductsIfEmpty();

    const result = await sql`
      UPDATE products
      SET category = ${category},
          updated_at = NOW()
    `;
    return NextResponse.json({ success: true, category, updatedCount: result.rowCount ?? 0 });
  } catch (e) {
    console.error("POST /api/products/bulk-category:", e);
    return NextResponse.json({ success: false, error: "فشل في تحديث التصنيف" }, { status: 500 });
  }
}

