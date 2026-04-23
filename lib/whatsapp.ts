import { siteConfig } from "@/lib/config";

const TELEGRAM_USERNAME = (siteConfig.telegram ?? "").trim();

export function generateWhatsAppLink(productName: string, sku: string): string {
  const message = `مرحباً، أريد الاستفسار عن: ${productName} (الكود: ${sku}).`;
  const encodedMessage = encodeURIComponent(message);
  if (!TELEGRAM_USERNAME) return "";
  return `https://t.me/${TELEGRAM_USERNAME}?text=${encodedMessage}`;
}

export function generateWhatsAppLinkGeneral(): string {
  const message = "مرحباً، أريد الاستفسار عن الهدايا المعروضة.";
  const encodedMessage = encodeURIComponent(message);
  if (!TELEGRAM_USERNAME) return "";
  return `https://t.me/${TELEGRAM_USERNAME}?text=${encodedMessage}`;
}

