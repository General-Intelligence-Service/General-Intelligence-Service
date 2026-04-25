/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  الشعار — من هنا تغيّر الشعار متى شئت (مكان واحد)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  أ) ضع ملف الصورة داخل المجلد: public/
 *     مثال: public/شعاري.png  ←  المسار في الموقع يصبح /شعاري.png
 *
 *  ب) حدّد المسار في الأسطر التالية:
 *     - إمّا غيّر القيمة الافتراضية في defaultLogoPath أدناه
 *     - أو أنشئ ملف .env.local (انظر .env.example) واضبط:
 *       NEXT_PUBLIC_SITE_LOGO_PATH=/شعاري.png
 *       (يبدأ المسار دائماً بـ /)
 *
 *  ج) الشعار الأفقي (الرأس + الصفحة الرئيسية + PDF): logoPath أدناه.
 *
 *  د) أيقونة الدرع (تبويب المتصفح + اختصار التطبيق PWA): iconPath أدناه.
 *     ضع ملف الأيقونة في public/ (مثال: public/new-logo-icon.ico) ويفضّل
 *     أيضاً نسخها إلى app/icon.ico ليستخدمها Next كـ favicon.
 *
 *  هـ) ملفات PDF تقرأ pdfLogoPath (افتراضيًا /logo_pdf.png — انسخ هنا شعار PDF مثل LOGO-PDF.png).
 * ═══════════════════════════════════════════════════════════════════════════
 */
const defaultLogoPath = "/new-logo.png";
const defaultLogoDarkPath = "/LOGO-PDF.png";
const defaultPdfLogoPath = "/logo_pdf.png";
const defaultIconPath = "/new-logo-icon.ico";

function resolveLogoPath(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SITE_LOGO_PATH?.trim()
      : undefined;
  if (fromEnv) {
    return fromEnv.startsWith("/") ? fromEnv : `/${fromEnv}`;
  }
  return defaultLogoPath;
}

function resolveLogoDarkPath(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SITE_LOGO_DARK_PATH?.trim()
      : undefined;
  if (fromEnv) {
    return fromEnv.startsWith("/") ? fromEnv : `/${fromEnv}`;
  }
  return defaultLogoDarkPath;
}

function resolveIconPath(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SITE_ICON_PATH?.trim()
      : undefined;
  if (fromEnv) {
    return fromEnv.startsWith("/") ? fromEnv : `/${fromEnv}`;
  }
  return defaultIconPath;
}

function resolvePdfLogoPath(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_PDF_LOGO_PATH?.trim()
      : undefined;
  if (fromEnv) {
    return fromEnv.startsWith("/") ? fromEnv : `/${fromEnv}`;
  }
  return defaultPdfLogoPath;
}

export const siteConfig = {
  name: "كتالوج الهدايا",
  description: "معرض للهدايا الرسمية",
  logoPath: resolveLogoPath(),
  logoDarkPath: resolveLogoDarkPath(),
  /**
   * نسخة بسيطة لكسر كاش المتصفح/Service Worker عند استبدال ملف الشعار بنفس الاسم.
   * غيّر الرقم فقط عند تحديث ملفات الشعار تحت public/.
   */
  logoAssetVersion: 12,
  /** شعار خاص بملفات الـPDF */
  pdfLogoPath: resolvePdfLogoPath(),
  /** أيقونة مربعة/درع — تبويب المتصفح وmanifest التطبيق (ليس الشعار الأفقي) */
  iconPath: resolveIconPath(),
  /** نص يظهر عند تعطيل الصور أو قارئ الشاشة */
  logoAlt: "شعار جهاز الاستخبارات العامة — General Intelligence Service",
  phone: "",
  telegram: "",
  telegramUrl: "",
  instagram: "",
  email: "gift.gis.011@gmail.com",
  /** رسالة الشريط العلوي (اتركها فارغة لإخفاء الشريط) */
  announcement: "",
  /** آخر موعد للطلب لاستلام في تاريخ محدد (يُعرض في الواجهة). اتركه فارغاً لعدم الإظهار. */
  deliveryDeadlineText: "",
  /** عدد الأيام بعد اليوم لحساب تاريخ الاستلام الديناميكي (مثلاً 5 = استلام بعد 5 أيام). */
  deliveryDaysOffset: 5,
};

