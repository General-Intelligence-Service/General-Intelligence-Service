export const TELEGRAM_USERNAME = "Mojahd_N"; // معرف تيليجرام - يمكن تغييره

export function generateWhatsAppLink(productName: string, sku: string): string {
  const message = `مرحباً، أريد الاستفسار عن: ${productName} (الكود: ${sku}).`;
  const encodedMessage = encodeURIComponent(message);
  return `https://t.me/${TELEGRAM_USERNAME}?text=${encodedMessage}`;
}

export function generateWhatsAppLinkGeneral(): string {
  const message = "مرحباً، أريد الاستفسار عن الهدايا المعروضة.";
  const encodedMessage = encodeURIComponent(message);
  return `https://t.me/${TELEGRAM_USERNAME}?text=${encodedMessage}`;
}

