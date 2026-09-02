import { z } from "zod";
import { MAX_QTY_PER_ITEM } from "@/lib/shop-config";

/** مخطّط عناصر الطلب. لا سعر هنا إطلاقاً — الخادم يحسبه من قاعدة البيانات. */
export const orderItemSchema = z.object({
  productSlug: z.string().min(1).max(80),
  variantSlug: z.string().min(1).max(80),
  sizeLabel: z.string().min(1).max(10),
  quantity: z.number().int().min(1).max(MAX_QTY_PER_ITEM),
});

export const customerSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(80),
  // أرقام الخليج بصيغ متعددة؛ نقبل ٩–١٥ رقماً مع + اختيارية
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{9,18}$/, "رقم الجوال غير صحيح"),
  city: z.string().trim().min(2, "المدينة مطلوبة").max(60),
  address: z.string().trim().min(5, "العنوان قصير جداً").max(300),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "السلة فارغة").max(30),
  customer: customerSchema,
  paymentMethod: z.enum(["cod", "transfer"]),
  /** معرّف المحفظة المختارة عند التحويل؛ للعرض في لوحة الإدارة. */
  walletId: z.string().trim().max(40).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
