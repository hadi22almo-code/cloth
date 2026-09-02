import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionForm } from "../ActionForm";
import { AdminNotice, requireAdmin } from "../AdminGuard";
import {
  addVariant,
  deleteVariant,
  removeVariantImage,
  updateProduct,
  updateSizeStock,
  updateVariant,
  uploadVariantImage,
} from "../actions";

// صفحات الإدارة تخصّ مستخدماً بعينه: لا تُصيَّر مسبقاً ولا تُخزَّن أبداً
export const dynamic = "force-dynamic";


/*
 * لا تعريف يدوي للصف: العميل يحمل نوع المخطّط فيستنتج شكل الاستعلام المتداخل.
 * أي عمود يُحذف من القاعدة يصير خطأ ترجمة هنا لا مفاجأة في الإنتاج.
 */

const input =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm hover:border-muted";

export default async function AdminProductsPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <AdminNotice reason={guard.reason} />;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase!
    .from("products")
    .select(
      `id, slug, name_ar, description_ar, price, currency,
       product_variants ( id, slug, color_name_ar, color_hex, image_url, stock, position ),
       product_sizes ( id, label, stock, position )`,
    )
    .order("position", { referencedTable: "product_variants" })
    .order("position", { referencedTable: "product_sizes" });

  const products = data ?? [];

  if (products.length === 0) {
    return (
      <AdminNotice reason="لا توجد منتجات. شغّل supabase/seed.sql لإضافة بيانات أوّلية." />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8">
      {products.map((product) => (
        <section key={product.id} className="flex flex-col gap-6">
          <h1 className="text-xl font-bold">
            {product.name_ar}{" "}
            <bdi className="text-sm font-normal text-muted">{product.slug}</bdi>
          </h1>

          {/* بيانات المنتج */}
          <ActionForm
            action={updateProduct}
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <input type="hidden" name="id" value={product.id} />
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold">الاسم</span>
                <input name="name_ar" defaultValue={product.name_ar} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold">
                  السعر <bdi className="text-muted">({product.currency})</bdi>
                </span>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  dir="ltr"
                  defaultValue={Number(product.price)}
                  className={`${input} text-start`}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">الوصف</span>
              <textarea
                name="description_ar"
                rows={2}
                defaultValue={product.description_ar}
                className={input}
              />
            </label>
            <button type="submit" className={`${button} self-start`}>
              حفظ بيانات المنتج
            </button>
          </ActionForm>

          {/* الألوان */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-3 font-bold">
              الألوان{" "}
              <span className="text-sm font-normal text-muted">
                (كل لون قميص على القرص)
              </span>
            </h2>

            <ul className="flex flex-col gap-2">
              {product.product_variants.map((variant) => (
                <li
                  key={variant.id}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3"
                >
                  <ActionForm action={updateVariant} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={variant.id} />
                    <span
                      aria-hidden
                      className="size-9 rounded-md border border-border"
                      style={{ backgroundColor: variant.color_hex }}
                    />
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-muted">الاسم</span>
                      <input
                        name="color_name_ar"
                        defaultValue={variant.color_name_ar}
                        className={`${input} w-36`}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-muted">اللون</span>
                      <input
                        name="color_hex"
                        dir="ltr"
                        defaultValue={variant.color_hex}
                        className={`${input} w-28 text-start font-mono`}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-muted">المخزون</span>
                      <input
                        name="stock"
                        type="number"
                        min="0"
                        dir="ltr"
                        defaultValue={variant.stock}
                        className={`${input} w-24 text-start`}
                      />
                    </label>
                    <button type="submit" className={button}>
                      حفظ
                    </button>
                  </ActionForm>

                  {/*
                    الصورة الحقيقية تحلّ محلّ المجسّم في خانة هذا اللون على
                    القرص. بلا صورة يبقى المجسّم — فيعمل المتجر أثناء التصوير.
                  */}
                  <ActionForm
                    action={uploadVariantImage}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="id" value={variant.id} />
                    {variant.image_url ? (
                      <Image
                        src={variant.image_url}
                        alt={`صورة ${variant.color_name_ar}`}
                        width={48}
                        height={48}
                        className="size-12 rounded-md border border-border object-cover"
                      />
                    ) : (
                      <span className="grid size-12 place-items-center rounded-md border border-dashed border-border text-[10px] text-muted">
                        بلا صورة
                      </span>
                    )}
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-muted">صورة اللون</span>
                      <input
                        type="file"
                        name="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="min-h-11 w-52 rounded-lg border border-border bg-background p-2 text-xs file:me-2 file:rounded file:border-0 file:bg-surface-2 file:px-2 file:py-1 file:text-xs file:text-foreground"
                      />
                    </label>
                    <button type="submit" className={button}>
                      رفع
                    </button>
                  </ActionForm>

                  {variant.image_url && (
                    <ActionForm action={removeVariantImage}>
                      <input type="hidden" name="id" value={variant.id} />
                      <button
                        type="submit"
                        className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-muted hover:border-muted"
                      >
                        حذف الصورة
                      </button>
                    </ActionForm>
                  )}

                  <ActionForm action={deleteVariant} className="ms-auto">
                    <input type="hidden" name="id" value={variant.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:border-red-800 hover:text-red-300"
                    >
                      حذف
                    </button>
                  </ActionForm>
                </li>
              ))}
            </ul>

            <ActionForm
              action={addVariant}
              className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4"
            >
              <input type="hidden" name="product_id" value={product.id} />
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">المعرّف (للرابط)</span>
                <input
                  name="slug"
                  dir="ltr"
                  required
                  placeholder="banafsaji"
                  className={`${input} w-36 text-start`}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">الاسم</span>
                <input name="color_name_ar" required className={`${input} w-36`} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">اللون</span>
                <input
                  name="color_hex"
                  dir="ltr"
                  required
                  defaultValue="#888888"
                  className={`${input} w-28 text-start font-mono`}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">المخزون</span>
                <input
                  name="stock"
                  type="number"
                  min="0"
                  dir="ltr"
                  defaultValue={0}
                  className={`${input} w-24 text-start`}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">الترتيب</span>
                <input
                  name="position"
                  type="number"
                  min="0"
                  dir="ltr"
                  defaultValue={product.product_variants.length}
                  className={`${input} w-24 text-start`}
                />
              </label>
              <button type="submit" className={button}>
                إضافة لون
              </button>
            </ActionForm>
          </div>

          {/* المقاسات */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-3 font-bold">المقاسات</h2>
            <ul className="flex flex-wrap gap-2">
              {product.product_sizes.map((size) => (
                <li key={size.id}>
                  <ActionForm
                    action={updateSizeStock}
                    className="flex items-end gap-2 rounded-lg border border-border p-3"
                  >
                    <input type="hidden" name="id" value={size.id} />
                    <span className="pb-2 font-semibold">
                      <bdi>{size.label}</bdi>
                    </span>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-muted">المخزون</span>
                      <input
                        name="stock"
                        type="number"
                        min="0"
                        dir="ltr"
                        defaultValue={size.stock}
                        className={`${input} w-24 text-start`}
                      />
                    </label>
                    <button type="submit" className={button}>
                      حفظ
                    </button>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </main>
  );
}
