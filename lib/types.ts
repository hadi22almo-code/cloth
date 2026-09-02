/**
 * نماذج البيانات المشتركة.
 *
 * هذه الواجهات هي العقد بين طبقة البيانات وطبقة العرض. في المرحلة 1 تأتي من
 * `data/products.ts`، وفي المرحلة 2 تأتي من Supabase — بلا أي تغيير في كود الـ3D.
 */

export interface ColorVariant {
  /** معرّف مقروء يظهر في الرابط: ?color=aswad */
  slug: string;
  /** اسم اللون بالعربية، يُستخدم في aria-label وفي لوحة المنتج */
  nameAr: string;
  /** لون المادة بصيغة hex */
  hex: string;
  /** صورة بديلة تُستخدم عند غياب WebGL */
  image?: string;
  /** المخزون المتاح لهذا اللون */
  stock: number;
}

export interface SizeOption {
  label: string;
  /** المخزون لهذا المقاس؛ صفر يعني غير متوفر */
  stock: number;
}

export interface Product {
  slug: string;
  nameAr: string;
  descriptionAr: string;
  /** السعر بوحدة العملة الأساسية (وليس بالهللات) */
  price: number;
  currency: string;
  /** مسار ملف الـGLB داخل public؛ يُستخدم عند تفعيل NEXT_PUBLIC_USE_GLB */
  modelPath: string;
  variants: ColorVariant[];
  sizes: SizeOption[];
}

/** أوضاع مشهد العرض. `returning` ضرورية وإلا صارت الحلقة تفاعلية أثناء رحلة العودة. */
export type SceneMode = "carousel" | "focusing" | "focus" | "returning";
