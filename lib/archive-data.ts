/** مسار أرشيف الصور (تحت public) */
const ARCHIVE_ROOT = "ارشيف الصور";

/** فئة في أرشيف الصور: اسم المجلد + قائمة أسماء الملفات */
export interface ArchiveCategory {
  name: string;
  images: string[];
}

/** بناء مسار URL لصورة في الأرشيف (للاستخدام في src) */
export function getArchiveImageSrc(category: string, filename: string): string {
  const root = encodeURIComponent(ARCHIVE_ROOT).replace(/%2F/g, "/");
  const cat = encodeURIComponent(category).replace(/%2F/g, "/");
  return `/archive-images/${root}/${cat}/${encodeURIComponent(filename)}`;
}

/** قائمة فئات أرشيف الصور مع أسماء الملفات (مُستخرجة من المجلدات الموجودة) */
export const ARCHIVE_CATEGORIES: ArchiveCategory[] = [
  { name: "درع جلد بني صغير", images: ["2D1A4307.JPG", "2D1A4308.JPG", "2D1A4310.JPG", "2D1A4312.JPG"] },
  { name: "درع جلد اخضر صحن", images: ["2D1A4264.JPG", "2D1A4268.JPG", "2D1A4271.JPG", "2D1A4273.JPG"] },
  { name: "درع ورقة وريشة", images: ["2D1A4401.JPG", "2D1A4406.JPG", "2D1A4411.JPG", "2D1A4412.JPG"] },
  { name: "صدوق مصب قهوة وفناجين", images: ["2D1A4450.JPG", "2D1A4453.JPG", "2D1A4454.JPG"] },
  { name: "شنطا يدوية", images: ["2D1A4335.JPG", "2D1A4336.JPG", "2D1A4337.JPG"] },
  { name: "صندوق بروكار شنطا مصدفة", images: ["2D1A4245.JPG", "2D1A4248.JPG", "2D1A4251.JPG", "2D1A4255.JPG"] },
  { name: "صندوق بروكار كبير", images: ["2D1A4365.JPG", "2D1A4366.JPG", "2D1A4367.JPG", "2D1A4371.JPG"] },
  { name: "صندوق دفتر وقلم", images: ["2D1A4353.JPG", "2D1A4354.JPG", "2D1A4356.JPG", "2D1A4357.JPG"] },
  { name: "صندوق دلة", images: ["2D1A4386.JPG", "2D1A4389.JPG", "2D1A4390.JPG", "2D1A4392.JPG", "2D1A4397.JPG"] },
  { name: "صندوق شاشة", images: ["2D1A4433.JPG", "2D1A4436.JPG", "2D1A4438.JPG", "2D1A4439.JPG"] },
  { name: "صندوق مستطيل خشب ثقيل", images: ["2D1A4360.JPG", "2D1A4361.JPG", "2D1A4362.JPG", "2D1A4363.JPG"] },
  { name: "صندوق مبخرة نحاسية", images: ["2D1A4460.JPG", "2D1A4462.JPG", "2D1A4464.JPG", "2D1A4467.JPG"] },
  { name: "صندوق تمر فاخر 3", images: ["2D1A4414.JPG", "2D1A4416.JPG", "2D1A4417.JPG", "2D1A4419.JPG"] },
  { name: "صندوق تمر وسجادة صلاة 2", images: ["2D1A4424.JPG", "2D1A4429.JPG", "2D1A4432.JPG"] },
  { name: "فولدر جديد", images: ["2D1A4191.JPG", "2D1A4197.JPG", "2D1A4198.JPG", "2D1A4200.JPG", "2D1A4206.JPG"] },
  { name: "فولدر شكلة", images: ["2D1A4469.JPG", "2D1A4470.JPG", "2D1A4471.JPG"] },
  { name: "لوحة الجامع الاموي", images: ["2D1A4328.JPG", "2D1A4329.JPG", "2D1A4330.JPG"] },
  { name: "لوحة قلعة حلب", images: ["2D1A4330.JPG", "2D1A4331.JPG", "2D1A4332.JPG"] },
  { name: "مبخرة عامودية", images: ["2D1A4313.JPG", "2D1A4314.JPG", "2D1A4319.JPG", "2D1A4321.JPG"] },
  { name: "مبخرة سكي لاين", images: ["2D1A4231.JPG", "2D1A4232.JPG", "2D1A4235.JPG", "2D1A4238.JPG", "2D1A4239.JPG"] },
];
