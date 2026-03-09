import { NextRequest, NextResponse } from "next/server";
import { products, type Product, type GiftTier } from "@/data/products";

// GET - جلب جميع المنتجات
export async function GET() {
  try {
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "فشل في جلب المنتجات" },
      { status: 500 }
    );
  }
}

// POST - إضافة منتج جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newProduct: Product = {
      slug: body.slug || generateSlug(body.name),
      sku: body.sku,
      name: body.name,
      shortDescription: body.shortDescription,
      contents: Array.isArray(body.contents) ? body.contents : [],
      giftTier: body.giftTier as GiftTier,
      images: Array.isArray(body.images) ? body.images : [],
      availableQuantity: body.availableQuantity || 0,
      category: body.category,
      price: body.price,
    };

    // في الإنتاج، يجب حفظ البيانات في قاعدة بيانات
    // هنا سنستخدم ملف JSON مؤقت
    return NextResponse.json({
      success: true,
      message: "تم إضافة المنتج بنجاح",
      data: newProduct,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "فشل في إضافة المنتج" },
      { status: 500 }
    );
  }
}

// PUT - تحديث منتج
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, ...updatedData } = body;

    return NextResponse.json({
      success: true,
      message: "تم تحديث المنتج بنجاح",
      data: updatedData,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "فشل في تحديث المنتج" },
      { status: 500 }
    );
  }
}

// DELETE - حذف منتج
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "معرف المنتج مطلوب" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف المنتج بنجاح",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "فشل في حذف المنتج" },
      { status: 500 }
    );
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

