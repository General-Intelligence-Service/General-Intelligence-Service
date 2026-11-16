import type { Product } from "@/data/products";

/**
 * تصحيحات نصية معروفة في بيانات الكتالوج (حسب SKU).
 * تُطبَّق عند القراءة حتى تظهر فوراً دون انتظار تعديل يدوي في قاعدة البيانات.
 */
function fixText(text: string): string {
  return (text ?? "")
    .replace(/زيت\s*يتون/g, "زيت زيتون")
    .replace(/بداخلة/g, "بداخله")
    .replace(/شكلة\s*مفاتيح/g, "ميدالية مفاتيح");
}

function fixIncenseDescription(text: string): string {
  return (text ?? "").replace(
    /مبخرة\s*من\s*الجوز\s*بطعم\s*الصدف\s*البحري/g,
    "مبخرة من خشب الجوز مطعّمة بالصدف البحري"
  );
}

export function applyProductCopyFixes(product: Product): Product {
  const sku = (product.sku ?? "").trim().toUpperCase();
  let name = fixText(product.name);
  let shortDescription = fixText(product.shortDescription ?? "");
  let contents = (product.contents ?? []).map((c) => fixText(String(c)));

  // TODO(G07/G08): التمييز الوصفي بين الهديتين ما زال عاماً بعد تصحيح الصياغة المشتركة —
  // راجع محتوى كل من G07 و G08 لاحقاً لإبراز فرق الحجم/الشكل إن وُجد.
  if (sku === "G07" || sku === "G08") {
    name = fixIncenseDescription(name);
    shortDescription = fixIncenseDescription(shortDescription);
    contents = contents.map(fixIncenseDescription);
  }

  if (sku === "G14") {
    name = fixText(name);
    shortDescription = fixText(shortDescription);
    contents = contents.map(fixText);
  }

  if (sku === "G09") {
    name = fixText(name);
    shortDescription = fixText(shortDescription);
    contents = contents.map(fixText);
  }

  // طبّق التصحيحات العامة على كل المنتجات أيضاً
  name = fixText(name);
  shortDescription = fixText(shortDescription);
  contents = contents.map(fixText);

  return {
    ...product,
    name,
    shortDescription,
    contents,
  };
}

export function applyProductCopyFixesList(products: Product[]): Product[] {
  return (products ?? []).map(applyProductCopyFixes);
}
