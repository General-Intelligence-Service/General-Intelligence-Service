"use client";

import { toast } from "sonner";

const errMs = 5200;
const okMs = 3400;

/** رسالة خطأ أو فشل — تبقى أطول قليلاً */
export function notifyError(message: string) {
  toast.error(message, { duration: errMs });
}

/** نجاح العملية */
export function notifySuccess(message: string) {
  toast.success(message, { duration: okMs });
}

/** تحذير غير حرج */
export function notifyWarning(message: string) {
  toast.warning(message, { duration: errMs });
}

/** معلومة محايدة */
export function notifyInfo(message: string) {
  toast.message(message, { duration: okMs });
}
