import { Price } from "@/components/ui/Price";
import { RECEIPT_BUCKET } from "@/lib/receipts";
import { ORDER_STATUS_OPTIONS } from "@/lib/orders/status";
import { paymentMethodShort } from "@/lib/shop-config";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { ActionForm } from "../ActionForm";
import { AdminNotice, requireAdmin } from "../AdminGuard";
import { updateOrderStatus } from "../actions";

// صفحات الإدارة تخصّ مستخدماً بعينه: لا تُصيَّر مسبقاً ولا تُخزَّن أبداً
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  reference: string;
  status: string;
  payment_method: string;
  receipt_path: string | null;
  customer_name: string;
  phone: string;
  city: string;
  address: string;
  notes: string | null;
  total: number | string;
  currency: string;
  created_at: string;
  order_items: {
    size_label: string;
    quantity: number;
    unit_price: number | string;
    product_variants: { color_name_ar: string; color_hex: string } | null;
  }[];
}

/** التوقيت لا يُترك للخادم: بلا timeZone تظهر طلبات المساء على أنها أمس. */
const stamp = (iso: string) =>
  new Date(iso).toLocaleString("ar-IQ-u-nu-latn", {
    timeZone: "Asia/Baghdad",
    dateStyle: "short",
    timeStyle: "short",
  });

export default async function AdminOrdersPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <AdminNotice reason={guard.reason} />;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase!
    .from("orders")
    .select(
      `id, reference, status, payment_method, receipt_path, customer_name,
       phone, city, address, notes, total, currency, created_at,
       order_items ( size_label, quantity, unit_price,
         product_variants ( color_name_ar, color_hex ) )`,
    )
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Row[]>();

  const orders = data ?? [];

  /*
   * مخزن الإيصالات خاص، فلا رابط عام له. نولّد روابط موقّعة قصيرة العمر
   * بمفتاح الخدمة — الصفحة نفسها محميّة بفحص الإدارة أعلاه.
   */
  const receiptUrls = new Map<string, string>();
  const withReceipts = orders.filter((o) => o.receipt_path);
  if (withReceipts.length > 0) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      const { data: signed } = await admin.storage
        .from(RECEIPT_BUCKET)
        .createSignedUrls(
          withReceipts.map((o) => o.receipt_path as string),
          60 * 30,
        );
      signed?.forEach((entry, i) => {
        if (entry.signedUrl) receiptUrls.set(withReceipts[i].id, entry.signedUrl);
      });
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">
        الطلبات{" "}
        <span className="text-muted">
          (<bdi>{orders.length}</bdi>)
        </span>
      </h1>

      {orders.length === 0 ? (
        <p className="text-sm text-muted">لا توجد طلبات بعد.</p>
      ) : (
        /*
         * بطاقات لا جدول: الجدول كان يدفع «الحالة» و«الإجمالي» خارج الشاشة على
         * الهاتف، ولم يكن يعرض أصناف الطلب ولا عنوانه إطلاقاً — فيستحيل تجهيز
         * طلب من اللوحة وحدها.
         */
        <ul className="flex flex-col gap-4">
          {orders.map((order) => {
            const pieces = order.order_items.reduce(
              (n, i) => n + i.quantity,
              0,
            );
            return (
              <li
                key={order.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-accent">
                      <bdi>{order.reference}</bdi>
                    </p>
                    <p className="text-xs text-muted">{stamp(order.created_at)}</p>
                  </div>
                  <p className="text-lg font-bold">
                    <Price value={Number(order.total)} currency={order.currency} />
                  </p>
                </div>

                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="text-muted">العميل</dt>
                    <dd>{order.customer_name}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted">الهاتف</dt>
                    <dd>
                      <a
                        href={`tel:${order.phone}`}
                        className="text-accent underline"
                      >
                        <bdi>{order.phone}</bdi>
                      </a>
                    </dd>
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <dt className="shrink-0 text-muted">العنوان</dt>
                    <dd>
                      {order.city} — {order.address}
                    </dd>
                  </div>
                  {order.notes && (
                    <div className="flex gap-2 sm:col-span-2">
                      <dt className="shrink-0 text-muted">ملاحظات</dt>
                      <dd>{order.notes}</dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt className="text-muted">الدفع</dt>
                    <dd className="flex items-center gap-2">
                      {paymentMethodShort(order.payment_method)}
                      {order.payment_method === "transfer" &&
                        (receiptUrls.has(order.id) ? (
                          <a
                            href={receiptUrls.get(order.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-accent underline"
                          >
                            عرض الإيصال
                          </a>
                        ) : (
                          <span className="text-xs text-muted">بلا إيصال</span>
                        ))}
                    </dd>
                  </div>
                </dl>

                <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                  {order.order_items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span
                        aria-hidden
                        className="size-6 shrink-0 rounded border border-border ring-1 ring-inset ring-white/30"
                        style={{
                          backgroundColor:
                            item.product_variants?.color_hex ?? "#333",
                        }}
                      />
                      <span className="flex-1">
                        {item.product_variants?.color_name_ar ?? "لون محذوف"} ·
                        مقاس <bdi>{item.size_label}</bdi>
                      </span>
                      <span className="text-muted">
                        × <bdi>{item.quantity}</bdi>
                      </span>
                      <Price
                        value={Number(item.unit_price) * item.quantity}
                        currency={order.currency}
                      />
                    </li>
                  ))}
                  <li className="text-xs text-muted">
                    إجمالي القطع: <bdi>{pieces}</bdi>
                  </li>
                </ul>

                <ActionForm
                  action={updateOrderStatus}
                  className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3"
                >
                  <input type="hidden" name="id" value={order.id} />
                  <label className="text-sm text-muted" htmlFor={`st-${order.id}`}>
                    الحالة
                  </label>
                  <select
                    id={`st-${order.id}`}
                    name="status"
                    defaultValue={order.status}
                    className="min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {ORDER_STATUS_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="min-h-11 rounded-lg border border-border px-4 py-2 text-sm hover:border-muted focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    حفظ
                  </button>
                </ActionForm>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
