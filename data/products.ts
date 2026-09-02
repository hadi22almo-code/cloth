import type { Product } from "@/lib/types";

/**
 * بيانات المرحلة 1 المحلية. تُستبدل في المرحلة 2 بقراءة من Supabase خلف نفس
 * الواجهة في `lib/types.ts` — بلا أي تغيير في مكوّنات العرض.
 */
export const tshirt: Product = {
  slug: "tshirt-classic",
  nameAr: "تيشيرت قطن كلاسيكي",
  descriptionAr:
    "قطن مُمشّط 100٪ بوزن 240 غرام، قصّة مستقيمة وياقة مضلّعة تحافظ على شكلها بعد الغسيل.",
  price: 25000,
  currency: "IQD",
  modelPath: "/models/tshirt.glb",
  variants: [
    { slug: "aswad", nameAr: "أسود", hex: "#17171a", stock: 24 },
    { slug: "abyad", nameAr: "أبيض", hex: "#f2f0ec", stock: 31 },
    { slug: "ramadi", nameAr: "رمادي", hex: "#8b8d93", stock: 18 },
    { slug: "kuhli", nameAr: "كحلي", hex: "#1e2f52", stock: 12 },
    { slug: "ahmar", nameAr: "أحمر قاني", hex: "#a81f2b", stock: 9 },
    { slug: "akhdar", nameAr: "أخضر زيتي", hex: "#4a5b34", stock: 15 },
    { slug: "bejj", nameAr: "بيج رملي", hex: "#c9b294", stock: 20 },
    { slug: "azraq", nameAr: "أزرق سماوي", hex: "#4f86b8", stock: 7 },
    { slug: "khamri", nameAr: "خمري", hex: "#5c2233", stock: 11 },
    { slug: "asfar", nameAr: "أصفر خردلي", hex: "#c99a2e", stock: 6 },
  ],
  sizes: [
    { label: "S", stock: 8 },
    { label: "M", stock: 21 },
    { label: "L", stock: 17 },
    { label: "XL", stock: 10 },
    { label: "XXL", stock: 0 },
  ],
};

export const products: Product[] = [tshirt];
