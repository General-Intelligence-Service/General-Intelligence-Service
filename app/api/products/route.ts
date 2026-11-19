import { NextRequest, NextResponse } from "next/server";
import { products as staticProducts, type Product, type GiftTier } from "@/data/products";
import {
  isProductsDbConfigured,
  ensureProductsTable,
  seedProductsIfEmpty,
  syncInitialProducts,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getNextAvailableSku,
  getProductBySlug,
} from "@/lib/products-db";
import { getSession } from "@/lib/auth-session";
import { auditRequestMeta, writeAuditLog } from "@/lib/audit-log";
import { classifyProductUpdateAction, productDiff } from "@/lib/audit-product";
import { generateProductSlug } from "@/lib/slug";
import { productCreateSchema, productUpdateSchema } from "@/lib/product-schemas";
import { withNoStore } from "@/lib/security-headers";

export const dynamic = "force-dynamic";

function sanitizePublicProduct(p: Product): Omit<Product, "hidden" | "archived"> & {
  hidden?: undefined;
  archived?: undefined;
} {
  const { hidden: _h, archived: _a, ...rest } = p;
  return rest;
}

function filterPublic(list: Product[]): Product[] {
  return list
    .filter((p) => !p.hidden && !p.archived)
    .map((p) => sanitizePublicProduct(p) as Product);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = request.nextUrl;
    const includeArchived =
      !!session &&
      (searchParams.get("include_archived") === "1" ||
        searchParams.get("include_archived") === "true");
    const includeHidden =
      !!session &&
      (searchParams.get("include_hidden") === "1" ||
        searchParams.get("include_hidden") === "true");
    const quick =
      searchParams.get("quick") === "1" || searchParams.get("quick") === "true";

    if (!isProductsDbConfigured()) {
      const data = session
        ? staticProducts.filter((p) => (includeArchived || !p.archived) && (includeHidden || !p.hidden))
        : filterPublic(staticProducts);
      return NextResponse.json(
        { success: true, data },
        session ? withNoStore({ status: 200 }) : { status: 200 }
      );
    }

    await ensureProductsTable();
    await seedProductsIfEmpty();
    if (!quick) {
      await syncInitialProducts();
    }

    let data = await getAllProducts(
      session ? includeArchived : false,
      session ? includeHidden : false
    );

    if (!session) {
      data = filterPublic(data);
    }

    return NextResponse.json(
      { success: true, data },
      session ? withNoStore({ status: 200 }) : { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/products:", error);
    return NextResponse.json(
      { success: false, error: "فشل في جلب الهدايا" },
      withNoStore({ status: 500 })
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول" },
        withNoStore({ status: 401 })
      );
    }
    if (!isProductsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        withNoStore({ status: 503 })
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "بيانات غير صالحة", details: parsed.error.flatten() },
        withNoStore({ status: 400 })
      );
    }

    const v = parsed.data;
    const requestedSku = (v.sku ?? "").trim();
    let newProduct: Product = {
      slug: (v.slug && v.slug.trim()) || generateProductSlug(v.name.trim()),
      sku: requestedSku || (await getNextAvailableSku()),
      name: v.name.trim(),
      shortDescription: (v.shortDescription ?? "").trim(),
      contents: (v.contents ?? []).map((c) => String(c).trim()).filter(Boolean),
      giftTier: (v.giftTier as GiftTier) || "standard",
      images: v.images ?? [],
      availableQuantity: v.availableQuantity ?? 0,
      category: v.category ?? undefined,
      price: v.price ?? undefined,
      archived: v.archived,
      hidden: v.hidden,
    };

    await ensureProductsTable();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await createProduct(newProduct);
        await writeAuditLog({
          actorEmail: session.email,
          action: "product.create",
          targetType: "هدية",
          targetId: newProduct.sku,
          targetLabel: newProduct.name,
          ...auditRequestMeta(request),
          result: "success",
        });
        return NextResponse.json(
          { success: true, message: "تم إضافة الهدية بنجاح", data: newProduct },
          withNoStore({ status: 200 })
        );
      } catch (error) {
        const dbError = error as { code?: string; constraint?: string };
        const isSkuConflict =
          dbError?.code === "23505" && dbError?.constraint === "products_sku_key";
        if (isSkuConflict && attempt < 2) {
          newProduct = { ...newProduct, sku: await getNextAvailableSku() };
          continue;
        }
        throw error;
      }
    }
  } catch (error) {
    console.error("POST /api/products:", error);
    return NextResponse.json(
      { success: false, error: "فشل في إضافة الهدية" },
      withNoStore({ status: 500 })
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول" },
        withNoStore({ status: 401 })
      );
    }
    if (!isProductsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        withNoStore({ status: 503 })
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = productUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "بيانات غير صالحة", details: parsed.error.flatten() },
        withNoStore({ status: 400 })
      );
    }

    const v = parsed.data;
    const updatedData: Partial<Product> = {
      sku: v.sku !== undefined ? v.sku.trim() : undefined,
      name: v.name !== undefined ? v.name.trim() : undefined,
      shortDescription:
        v.shortDescription !== undefined ? v.shortDescription.trim() : undefined,
      contents: v.contents?.map((c) => String(c).trim()).filter(Boolean),
      giftTier: v.giftTier,
      images: v.images,
      availableQuantity: v.availableQuantity,
      category: v.category === null ? undefined : v.category,
      price: v.price === null ? undefined : v.price,
      archived: v.archived,
      hidden: v.hidden,
    };

    await ensureProductsTable();
    const before = await getProductBySlug(v.slug);
    const updated = await updateProduct(v.slug, updatedData);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "الهدية غير موجودة" },
        withNoStore({ status: 404 })
      );
    }
    if (before) {
      const changes = productDiff(before, updated);
      if (Object.keys(changes).length > 0) {
        await writeAuditLog({
          actorEmail: session.email,
          action: classifyProductUpdateAction(before, updated, changes),
          targetType: "هدية",
          targetId: updated.sku,
          targetLabel: updated.name,
          changes,
          ...auditRequestMeta(request),
          result: "success",
        });
      }
    }
    return NextResponse.json(
      { success: true, message: "تم تحديث الهدية بنجاح", data: updated },
      withNoStore({ status: 200 })
    );
  } catch (error) {
    console.error("PUT /api/products:", error);
    return NextResponse.json(
      { success: false, error: "فشل في تحديث الهدية" },
      withNoStore({ status: 500 })
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول" },
        withNoStore({ status: 401 })
      );
    }
    if (!isProductsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        withNoStore({ status: 503 })
      );
    }
    const slug = request.nextUrl.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "معرّف الهدية مطلوب" },
        withNoStore({ status: 400 })
      );
    }
    await ensureProductsTable();
    const before = await getProductBySlug(slug);
    const deleted = await deleteProduct(slug);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "الهدية غير موجودة" },
        withNoStore({ status: 404 })
      );
    }
    await writeAuditLog({
      actorEmail: session.email,
      action: "product.delete",
      targetType: "هدية",
      targetId: before?.sku ?? slug,
      targetLabel: before?.name ?? slug,
      ...auditRequestMeta(request),
      result: "success",
    });
    return NextResponse.json(
      { success: true, message: "تم حذف الهدية بنجاح" },
      withNoStore({ status: 200 })
    );
  } catch (error) {
    console.error("DELETE /api/products:", error);
    return NextResponse.json(
      { success: false, error: "فشل في حذف الهدية" },
      withNoStore({ status: 500 })
    );
  }
}
