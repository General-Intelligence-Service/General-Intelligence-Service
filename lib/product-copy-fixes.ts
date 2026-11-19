import type { Product } from "@/data/products";

/**
 * تصحيحات نصية معروفة في بيانات الكتالوج (حسب SKU).
 * تُطبَّق عند القراءة حتى تظهر فوراً دون انتظار تعديل يدوي في قاعدة البيانات.
 */
function fixText(text: string): string {
  return (text ?? "")
    .replace(/صنظوق/g, "صندوق")
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

function trimFields(product: Product): Product {
  return {
    ...product,
    name: (product.name ?? "").trim(),
    shortDescription: (product.shortDescription ?? "").trim(),
    sku: (product.sku ?? "").trim(),
    contents: (product.contents ?? []).map((c) => String(c).trim()).filter(Boolean),
  };
}

export function applyProductCopyFixes(product: Product): Product {
  const sku = (product.sku ?? "").trim().toUpperCase();
  let name = fixText(product.name);
  let shortDescription = fixText(product.shortDescription ?? "");
  let contents = (product.contents ?? []).map((c) => fixText(String(c)));

  if (sku === "G04") {
    name = fixText(name);
    shortDescription = fixText(shortDescription);
    contents = contents.map(fixText);
  }

  if (sku === "G07") {
    name = fixIncenseDescription(name);
    shortDescription = fixIncenseDescription(shortDescription);
    contents = contents.map(fixIncenseDescription);
    // تمييز واضح عن G08
    if (/مبخرة/i.test(name) && !/الجمهورية\s*السورية/i.test(name)) {
      name = "مبخرة الجمهورية السورية من خشب الجوز مطعّمة بالصدف البحري";
    } else if (!/الجمهورية\s*السورية/i.test(name)) {
      name = `مبخرة الجمهورية السورية — ${name}`.trim();
    }
    if (!shortDescription || shortDescription === fixIncenseDescription(product.shortDescription ?? "")) {
      shortDescription =
        shortDescription ||
        "مبخرة الجمهورية السورية من خشب الجوز مطعّمة بالصدف البحري.";
    }
  }

  if (sku === "G08") {
    name = fixIncenseDescription(name);
    shortDescription = fixIncenseDescription(shortDescription);
    contents = contents.map(fixIncenseDescription);
    if (/مبخرة/i.test(name) && !/الوردة\s*الدمشقية/i.test(name)) {
      name = "مبخرة الوردة الدمشقية من خشب الجوز مطعّمة بالصدف البحري";
    } else if (!/الوردة\s*الدمشقية/i.test(name)) {
      name = `مبخرة الوردة الدمشقية — ${name}`.trim();
    }
    if (!shortDescription) {
      shortDescription = "مبخرة الوردة الدمشقية من خشب الجوز مطعّمة بالصدف البحري.";
    }
  }

  // TODO(G07/G08): راجع صور/محتويات كل هدية لاحقاً لإبراز فرق الحجم أو الشكل في الوصف التفصيلي إن لزم.

  if (sku === "G09") {
    name = fixText(name);
    shortDescription = fixText(shortDescription);
    contents = contents.map(fixText);
  }

  if (sku === "G14") {
    name = fixText(name);
    shortDescription = fixText(shortDescription);
    contents = contents.map(fixText);
  }

  name = fixText(name);
  shortDescription = fixText(shortDescription);
  contents = contents.map(fixText);

  return trimFields({
    ...product,
    name,
    shortDescription,
    contents,
  });
}

export function applyProductCopyFixesList(products: Product[]): Product[] {
  return (products ?? []).map(applyProductCopyFixes);
}
