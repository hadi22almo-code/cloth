import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Price } from "@/components/ui/Price";
import { orderStatusLabel } from "@/lib/orders/status";
import { WALLETS, paymentMethodLabel } from "@/lib/shop-config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { ReceiptUpload } from "./ReceiptUpload";

export const metadata: Metadata = { title: "تفاصيل الطلب — قرص الألوان" };

/*
 * لا تعريف يدوي للصف: العميل يحمل نوع المخطّط فيستنتج شكل الاستعلام المتداخل.
 * أي عمود يُحذف من القاعدة يصير خطأ ترجمة هنا لا مفاجأة في الإنتاج.
 */

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdminClient();

  // معرّف الطلب UUID عشوائي، فهو بمثابة رابط سرّي لضيف بلا حساب
  const { data } = admin
    ? await admin
        .from("orders")
        .select(
          `id, reference, status, payment_method, wallet_id, receipt_path,
           customer_name, phone, city,
           address, subtotal, shipping, total, currency, created_at,
           order_items ( size_label, quantity, unit_price,
             product_variants ( color_name_ar, color_hex ) )`,
        )
        .eq("id", id)
        .maybeSingle()
    : { data: null };

  if (!data) notFound();

  const wallet = WALLETS.find((w) => w.id === data.wallet_id) ?? null;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">تم استلام طلبك</p>
        <h1 className="mt-1 text-2xl font-bold">
          رقم الطلب <bdi className="text-accent">{data.reference}</bdi>
        </h1>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">الحالة</dt>
            <dd>{orderStatusLabel(data.status)}</dd>
          </div>
          <div>
            <dt className="text-muted">طريقة الدفع</dt>
            <dd>{paymentMethodLabel(data.payment_method)}</dd>
          </div>
          <div>
            <dt className="text-muted">المستلِم</dt>
            <dd>{data.customer_name}</dd>
          </div>
          <div>
            <dt className="text-muted">الجوال</dt>
            <dd>
              <bdi>{data.phone}</bdi>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted">العنوان</dt>
            <dd>
              {data.city} — {data.address}
            </dd>
          </div>
        </dl>

        {data.payment_method === "transfer" && (
          <section className="mt-6 flex flex-col gap-3 rounded-xl border border-accent/40 bg-background p-4">
            <h2 className="font-bold">تعليمات التحويل</h2>
            {wallet ? (
              <p className="text-sm leading-relaxed">
                حوّل مبلغ{" "}
                <Price
                  value={Number(data.total)}
                  currency={data.currency}
                  className="font-bold text-accent"
                />{" "}
                إلى {wallet.nameAr} على الرقم{" "}
                <bdi className="font-mono text-accent">{wallet.number}</bdi>، ثم
                أرفق صورة الإيصال أدناه.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-muted">
                تواصل معنا لاستلام رقم المحفظة، ثم أرفق صورة الإيصال أدناه.
              </p>
            )}
            <ReceiptUpload
              orderId={data.id}
              hasReceipt={Boolean(data.receipt_path)}
            />
          </section>
        )}

        <ul className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
          {data.order_items.map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className="size-7 shrink-0 rounded border border-border"
                style={{
                  backgroundColor: item.product_variants?.color_hex ?? "#333",
                }}
              />
              <span className="flex-1">
                {item.product_variants?.color_name_ar ?? "لون"} · مقاس{" "}
                <bdi>{item.size_label}</bdi> × <bdi>{item.quantity}</bdi>
              </span>
              <Price
                value={Number(item.unit_price) * item.quantity}
                currency={data.currency}
              />
            </li>
          ))}
        </ul>

        <dl className="mt-4 flex flex-col gap-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">المجموع الفرعي</dt>
            <dd>
              <Price value={Number(data.subtotal)} currency={data.currency} />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">الشحن</dt>
            <dd>
              {Number(data.shipping) === 0 ? (
                "مجاني"
              ) : (
                <Price value={Number(data.shipping)} currency={data.currency} />
              )}
            </dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-bold">
            <dt>الإجمالي</dt>
            <dd className="text-accent">
              <Price value={Number(data.total)} currency={data.currency} />
            </dd>
          </div>
        </dl>
      </div>

      <Link
        href="/"
        className="mt-6 inline-block text-sm text-muted hover:text-foreground"
      >
        → العودة إلى القرص
      </Link>
    </main>
  );
}
