import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * اختبارات **مسار المال**.
 *
 * `buildQuote` هو المكان الذي يُقرَّر فيه ما سيدفعه الزبون وما سيُخصم من
 * المخزون. كان مغطّى بالفحص اليدوي وحده، أي أن أي تعديل لاحق قد يكسر التسعير
 * بصمت. هنا نثبّت سلوكه: السعر من قاعدة البيانات لا من العميل، والتوفّر
 * يُفحص على مجموع الأسطر، والمنتج المخفيّ لا يُطلب.
 *
 * قاعدة البيانات مُقلَّدة: نختبر منطق التسعير لا PostgREST.
 */

interface FakeVariant {
  id: string;
  slug: string;
  color_name_ar: string;
  stock: number;
}
interface FakeProduct {
  slug: string;
  name_ar: string;
  price: number;
  currency: string;
  is_active?: boolean;
  product_variants: FakeVariant[];
  product_sizes: { label: string; stock: number }[];
}

/** ما ستعيده قاعدة البيانات المُقلَّدة في هذا الاختبار. */
let rows: FakeProduct[] = [];
let dbError: unknown = null;
/** الفلاتر التي طبّقها الكود فعلاً — نتحقّق منها لا من نيّته. */
let applied: { column: string; value: unknown }[] = [];

/*
 * باني استعلامات Supabase **قابل للانتظار بنفسه**: لا تُستدعى دالة تنفيذ في
 * النهاية، بل ينتهي الانتظار على السلسلة مباشرةً. لذا يحمل المُقلِّد `then`.
 */
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => ({
    from: () => {
      const result = () => ({ data: rows, error: dbError });
      const builder = {
        select: () => builder,
        in: () => builder,
        eq: (column: string, value: unknown) => {
          applied.push({ column, value });
          return builder;
        },
        returns: () => builder,
        then: (
          resolve: (value: ReturnType<typeof result>) => unknown,
        ) => Promise.resolve(result()).then(resolve),
      };
      return builder;
    },
  }),
}));

const { buildQuote } = await import("./quote");

const product = (over: Partial<FakeProduct> = {}): FakeProduct => ({
  slug: "tee",
  name_ar: "تيشيرت",
  price: 25000,
  currency: "IQD",
  product_variants: [
    { id: "v-black", slug: "aswad", color_name_ar: "أسود", stock: 5 },
    { id: "v-white", slug: "abyad", color_name_ar: "أبيض", stock: 2 },
  ],
  product_sizes: [
    { label: "M", stock: 10 },
    { label: "XXL", stock: 0 },
  ],
  ...over,
});

const item = (over = {}) => ({
  productSlug: "tee",
  variantSlug: "aswad",
  sizeLabel: "M",
  quantity: 1,
  ...over,
});

beforeEach(() => {
  rows = [product()];
  dbError = null;
  applied = [];
});

describe("السعر يأتي من قاعدة البيانات", () => {
  it("يستخدم سعر الصف لا أي رقم من العميل", async () => {
    const result = await buildQuote([item({ quantity: 2 })]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quote.lines[0].unitPrice).toBe(25000);
    // 2 × 25000 = 50000، والشحن 5000 لأنه دون حدّ المجانية
    expect(result.quote.subtotal).toBe(50000);
    expect(result.quote.shipping).toBe(5000);
    expect(result.quote.total).toBe(55000);
  });

  it("الشحن يصبح مجانياً فوق الحدّ", async () => {
    const result = await buildQuote([item({ quantity: 4 })]);
    if (!result.ok) throw new Error("توقّعت نجاحاً");
    expect(result.quote.subtotal).toBe(100000);
    expect(result.quote.shipping).toBe(0);
    expect(result.quote.total).toBe(100000);
  });

  it("العملة تُؤخذ من المنتج", async () => {
    const result = await buildQuote([item()]);
    if (!result.ok) throw new Error("توقّعت نجاحاً");
    expect(result.quote.currency).toBe("IQD");
  });
});

describe("المنتجات المخفيّة", () => {
  it("يفلتر is_active صراحةً لأن مفتاح الخدمة يتخطّى سياسات الصفوف", async () => {
    await buildQuote([item()]);
    expect(applied).toContainEqual({ column: "is_active", value: true });
  });

  it("يرفض الطلب حين لا يعيد الاستعلام المنتج", async () => {
    rows = [];
    const result = await buildQuote([item()]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.error).toContain("لم يعد متاحاً");
  });
});

describe("التحقّق من الألوان والمقاسات", () => {
  it("يرفض لوناً غير موجود", async () => {
    const result = await buildQuote([item({ variantSlug: "banafsaji" })]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("الألوان");
  });

  it("يرفض مقاساً غير معروف", async () => {
    const result = await buildQuote([item({ sizeLabel: "XXXL" })]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toContain("مقاس غير معروف");
    }
  });

  it("يرفض مقاساً نفد مخزونه", async () => {
    const result = await buildQuote([item({ sizeLabel: "XXL" })]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.error).toContain("XXL");
    }
  });
});

describe("المخزون يُفحص على المجموع لا على كل سطر", () => {
  it("يقبل ما يساوي المتوفّر بالضبط", async () => {
    const result = await buildQuote([item({ quantity: 5 })]);
    expect(result.ok).toBe(true);
  });

  it("يرفض ما يتجاوزه بواحد", async () => {
    const result = await buildQuote([item({ quantity: 6 })]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });

  it("يجمع أسطراً متعددة لنفس اللون قبل المقارنة", async () => {
    // ثلاثة أسطر بكمية 2 لنفس اللون = 6 > 5، ولو فُحص كل سطر وحده لمرّ
    const lines = [
      item({ quantity: 2 }),
      item({ quantity: 2 }),
      item({ quantity: 2 }),
    ];
    const result = await buildQuote(lines);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("أسود");
  });

  it("يعدّ كل لون على حدة", async () => {
    const result = await buildQuote([
      item({ quantity: 5 }),
      item({ variantSlug: "abyad", quantity: 2 }),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quote.subtotal).toBe(7 * 25000);
  });
});

describe("العملات المختلطة", () => {
  it("يرفض سلة تجمع منتجين بعملتين", async () => {
    rows = [
      product(),
      product({ slug: "hoodie", currency: "USD", price: 30 }),
    ];
    const result = await buildQuote([item()]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toContain("عملات مختلفة");
    }
  });
});

describe("أعطال قاعدة البيانات", () => {
  it("يعيد ٥٠٠ عند فشل الاستعلام بدل أن يمرّر بيانات ناقصة", async () => {
    dbError = { message: "boom" };
    const result = await buildQuote([item()]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
  });
});
