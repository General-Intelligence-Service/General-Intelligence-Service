/** إيقاع موحّد لحركات الكتالوج (الصفحة الرئيسية + البطاقات) — سريع لتجنب فراغ التحميل */
export const catalogEase = [0.22, 1, 0.36, 1] as const;

export const catalogTransition = {
  duration: 0.22,
  ease: catalogEase,
} as const;

export const catalogFilterTransition = {
  duration: 0.2,
  ease: catalogEase,
} as const;

export const catalogStagger = 0.02;
