import { z } from "zod";

export const giftTierSchema = z.enum(["standard", "premium", "luxury"]);

const imageUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine((v) => v.startsWith("/") || /^https?:\/\//i.test(v), {
    message: "رابط صورة غير صالح",
  });

export const productCreateSchema = z.object({
  slug: z.string().trim().max(255).optional(),
  sku: z.string().trim().max(64).optional(),
  name: z.string().trim().min(1, "الاسم مطلوب").max(512),
  shortDescription: z.string().trim().max(4000).optional().default(""),
  contents: z
    .array(z.string().trim().max(500))
    .max(100)
    .optional()
    .default([]),
  giftTier: giftTierSchema.optional().default("standard"),
  images: z.array(imageUrlSchema).max(30).optional().default([]),
  availableQuantity: z.coerce.number().int().min(0).max(999999).optional().default(0),
  category: z.string().trim().max(128).nullish(),
  price: z.string().trim().max(64).nullish(),
  archived: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

export const productUpdateSchema = z.object({
  slug: z.string().trim().min(1).max(255),
  sku: z.string().trim().max(64).optional(),
  name: z.string().trim().min(1).max(512).optional(),
  shortDescription: z.string().trim().max(4000).optional(),
  contents: z.array(z.string().trim().max(500)).max(100).optional(),
  giftTier: giftTierSchema.optional(),
  images: z.array(imageUrlSchema).max(30).optional(),
  availableQuantity: z.coerce.number().int().min(0).max(999999).optional(),
  category: z.string().trim().max(128).nullish(),
  price: z.string().trim().max(64).nullish(),
  archived: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
  next: z.string().startsWith("/").max(500).optional(),
});
