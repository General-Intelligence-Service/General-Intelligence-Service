import { siteConfig } from "@/lib/config";

function digitsOnly(value: string): string {
  return (value ?? "").replace(/\D/g, "");
}

export function getWhatsAppNumber(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim()
      : undefined;
  return digitsOnly(fromEnv || siteConfig.phone || "");
}

export function getContactEmail(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim()
      : undefined;
  return (fromEnv || siteConfig.email || "").trim();
}

function inquireMessage(productName: string, sku: string): string {
  return `السلام عليكم، أرغب بالاستفسار عن هدية: ${productName} (كود: ${sku})`;
}

/**
 * رابط استفسار: واتساب إن وُجد الرقم، وإلا mailto، وإلا فارغ.
 */
export function generateWhatsAppLink(productName: string, sku: string): string {
  const message = inquireMessage(productName, sku);
  const encoded = encodeURIComponent(message);
  const phone = getWhatsAppNumber();
  if (phone) {
    return `https://wa.me/${phone}?text=${encoded}`;
  }
  const email = getContactEmail();
  if (email) {
    const subject = encodeURIComponent(`استفسار عن هدية: ${productName}`);
    return `mailto:${email}?subject=${subject}&body=${encoded}`;
  }
  return "";
}

export function generateWhatsAppLinkGeneral(): string {
  const message = "السلام عليكم، أرغب بالاستفسار عن الهدايا المعروضة.";
  const encoded = encodeURIComponent(message);
  const phone = getWhatsAppNumber();
  if (phone) return `https://wa.me/${phone}?text=${encoded}`;
  const email = getContactEmail();
  if (email) {
    return `mailto:${email}?subject=${encodeURIComponent("استفسار عن الهدايا")}&body=${encoded}`;
  }
  return "";
}
