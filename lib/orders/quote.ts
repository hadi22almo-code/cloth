import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { shippingFor } from "@/lib/shop-config";
import type { OrderItemInput } from "./schema";

export interface QuoteLine {
  variantId: string;
  productSlug: string;
  variantSlug: string;
  sizeLabel: string;
  quantity: number;
  /** السعر من قاعدة البيانات، لا من العميل. */
  unitPrice: number;
  nameAr: string;
  colorNameAr: string;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
}

export type QuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; status: number; error: string };

interface ProductRow {
  slug: string;
  name_ar: string;
  price: number | string;
  currency: string;
  product_variants: {
    id: string;
    slug: string;
    color_name_ar: string;
    stock: number;
  }[];
  /**
   * المقاسات هنا **راية توفّر** لا مخزون معدود: القطع محسوبة على اللون في
   * product_variants، فخصمها مرّتين يزوّر الجرد. نتحقّق أن المقاس موجود
   * ومتوفّر، ولا نخصم منه.
   */
  product_sizes: { label: string; stock: number }[];
}

const SELECT = `
  slug, name_ar, price, currency,
  product_variants ( id, slug, color_name_ar, stock ),
  product_sizes ( label, stock )
`;

/**
 * يحوّل عناصر السلة إلى فاتورة موثوقة.
 *
 * القاعدة الحاكمة: **لا يُوثق بأي شيء يرسله العميل** عدا المعرّفات والكميات.
 * السعر والعملة والتوفّر تُقرأ كلها من قاعدة البيانات هنا.
 */
export async function buildQuote(items: OrderItemInput[]): Promise<QuoteResult> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      ok: false,
      status: 503,
      error: "قاعدة البيانات غير مهيّأة بعد؛ أضف مفاتيح Supabase لتفعيل الطلبات.",
    };
  }

  const productSlugs = [...new Set(items.map((i) => i.productSlug))];

  /*
   * مفتاح الخدمة يتخطّى سياسات الصفوف، ومنها `products_read using (is_active)`.
   * لذا نفلتر is_active يدوياً هنا — بدونه يصبح أي منتج مخفيّ قابلاً للطلب
   * لمن يعرف معرّفه.
   */
  const { data, error } = await admin
    .from("products")
    .select(SELECT)
    .in("slug", productSlugs)
    .eq("is_active", true)
    .returns<ProductRow[]>();

  if (error) return { ok: false, status: 500, error: "تعذّر قراءة المنتجات." };

  const products = new Map(data.map((p) => [p.slug, p]));

  // العملة تُؤخذ من المنتجات لا من العميل، وخلط عملتين في طلب واحد مرفوض
  // لأن جمع مبالغ بوحدات مختلفة يعطي إجمالياً بلا معنى.
  const currencies = new Set(data.map((p) => p.currency));
  if (currencies.size > 1) {
    return {
      ok: false,
      status: 400,
      error: "لا يمكن جمع منتجات بعملات مختلفة في طلب واحد.",
    };
  }

  // الكميات مجمّعة لكل لون: المخزون يُفحص على المجموع لا على كل سطر وحده
  const perVariant = new Map<string, number>();
  for (const item of items) {
    const key = `${item.productSlug}|${item.variantSlug}`;
    perVariant.set(key, (perVariant.get(key) ?? 0) + item.quantity);
  }

  const lines: QuoteLine[] = [];

  for (const item of items) {
    const product = products.get(item.productSlug);
    if (!product) {
      return {
        ok: false,
        status: 400,
        error: "أحد المنتجات في السلة لم يعد متاحاً.",
      };
    }

    const variant = product.product_variants.find(
      (v) => v.slug === item.variantSlug,
    );
    if (!variant) {
      return {
        ok: false,
        status: 400,
        error: "أحد الألوان في السلة لم يعد متاحاً.",
      };
    }

    const size = product.product_sizes.find((s) => s.label === item.sizeLabel);
    if (!size) {
      return { ok: false, status: 400, error: "مقاس غير معروف." };
    }
    if (size.stock <= 0) {
      return {
        ok: false,
        status: 409,
        error: `المقاس ${size.label} غير متوفّر حالياً.`,
      };
    }

    const wanted = perVariant.get(`${item.productSlug}|${item.variantSlug}`) ?? 0;
    if (wanted > variant.stock) {
      return {
        ok: false,
        status: 409,
        error: `الكمية المطلوبة من اللون ${variant.color_name_ar} تتجاوز المتوفّر (${variant.stock}).`,
      };
    }

    lines.push({
      variantId: variant.id,
      productSlug: product.slug,
      variantSlug: variant.slug,
      sizeLabel: size.label,
      quantity: item.quantity,
      // numeric في Postgres يصل كنص حفاظاً على الدقة
      unitPrice: Number(product.price),
      nameAr: product.name_ar,
      colorNameAr: variant.color_name_ar,
    });
  }

  const currency = data[0]?.currency;
  if (!currency) {
    return { ok: false, status: 400, error: "السلة فارغة أو غير صالحة." };
  }

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const shipping = shippingFor(subtotal);

  return {
    ok: true,
    quote: { lines, subtotal, shipping, total: subtotal + shipping, currency },
  };
}
