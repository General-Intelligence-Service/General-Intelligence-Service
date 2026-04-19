/** إيقاع موحّد لحركات الكتالوج (الصفحة الرئيسية + البطاقات) */
export const catalogEase = [0.22, 1, 0.36, 1] as const;

export const catalogTransition = {
  duration: 0.5,
  ease: catalogEase,
} as const;

export const catalogFilterTransition = {
  duration: 0.42,
  ease: catalogEase,
} as const;

export const catalogStagger = 0.07;
