/** تسميات عربية لعمليات سجل النشاط */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "auth.login_success": "سجّل دخول",
  "auth.login_failed": "فشل تسجيل الدخول",
  "auth.login_locked": "حظر بسبب كثرة المحاولات",
  "auth.logout": "سجّل خروج",
  "auth.2fa_failed": "فشل رمز التحقق",
  "auth.2fa_backup_used": "استخدم رمزاً احتياطياً",
  "auth.2fa_enabled": "فعّل التحقق الثنائي",
  "auth.2fa_disabled": "عطّل التحقق الثنائي",
  "auth.2fa_backup_regenerated": "أعاد توليد الرموز الاحتياطية",
  "auth.2fa_reset_admin": "إعادة ضبط 2FA (سكربت إداري)",
  "product.create": "أضاف هدية",
  "product.update": "عدّل هدية",
  "product.delete": "حذف هدية",
  "product.hide": "أخفى هدية",
  "product.show": "أظهر هدية",
  "product.qty_change": "غيّر كمية هدية",
  "trip.create": "أنشأ رحلة",
  "trip.update": "عدّل رحلة",
  "trip.return": "سجّل عودة رحلة",
  "trip.delete": "حذف رحلة",
  "warehouse.movement": "سجّل حركة مستودع",
  "order.update": "عدّل طلبية",
  "order.delete": "حذف طلبية",
  "data.export_excel": "صدّر Excel",
  "data.import_excel": "استورد Excel",
  "data.backup_download": "حمّل نسخة احتياطية",
  "data.backup_restore": "استعاد من ملف",
  "data.audit_export_csv": "صدّر سجل النشاط",
  "upload.image": "رفع صورة",
  "upload.delete": "حذف صورة",
};

export const AUDIT_ACTION_OPTIONS = Object.entries(AUDIT_ACTION_LABELS).map(
  ([value, label]) => ({ value, label })
);

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

const RIYADH = "Asia/Riyadh";

export function formatAuditTime(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ar-SA", {
      timeZone: RIYADH,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return iso;
  }
}
