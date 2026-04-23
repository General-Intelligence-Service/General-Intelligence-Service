/** مسار أرشيف الصور (تحت public) — حالياً لا توجد فئات في الكود */
const ARCHIVE_ROOT = "ارشيف الصور";

export interface ArchiveCategory {
  name: string;
  images: string[];
}

export function getArchiveImageSrc(category: string, filename: string): string {
  const root = encodeURIComponent(ARCHIVE_ROOT).replace(/%2F/g, "/");
  const cat = encodeURIComponent(category).replace(/%2F/g, "/");
  return `/archive-images/${root}/${cat}/${encodeURIComponent(filename)}`;
}

/** قائمة فارغة — أضِف فئات هنا إن أعدت استخدام أرشيف الصور محلياً */
export const ARCHIVE_CATEGORIES: ArchiveCategory[] = [];
