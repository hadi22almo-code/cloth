import type { Enums } from "@/lib/supabase/database.types";

/**
 * حالات الطلب — **المصدر الوحيد** في طبقة التطبيق.
 *
 * كانت معرّفة في أربعة أماكن: نوع enum في SQL، ومخطّط Zod في إجراءات الإدارة،
 * وقائمة تسميات في جدول الطلبات، وخريطة أخرى في صفحة الطلب. إضافة حالة كانت
 * تعني أربعة تعديلات، ونسيان واحد لا يُكتشف إلا في الإنتاج.
 *
 * يبقى مصدر ثانٍ لا مفرّ منه: نوع `public.order_status` في
 * `supabase/migrations/0002_orders.sql`. القائمتان يجب أن تتطابقا، ولذلك
 * تجدهما متجاورتين في هذا التعليق:
 *
 *   create type public.order_status as enum
 *     ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');
 */
export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

/**
 * النوع يُشتقّ من نوع `order_status` في قاعدة البيانات لا من القائمة أعلاه.
 * فإن أُضيفت حالة في SQL ولم تُضف هنا، رفض المترجم `LABELS` لنقص مفتاح —
 * أي أن التطابق صار مفروضاً لا موصى به.
 */
export type OrderStatus = Enums<"order_status">;

const LABELS: Record<OrderStatus, string> = {
  pending: "بانتظار التأكيد",
  paid: "مدفوع",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغى",
};

/** التسمية العربية. الحالة غير المعروفة تُعرض كما هي بدل أن تختفي. */
export function orderStatusLabel(status: string): string {
  return LABELS[status as OrderStatus] ?? status;
}

/** أزواج (القيمة، التسمية) لقوائم الاختيار. */
export const ORDER_STATUS_OPTIONS = ORDER_STATUSES.map(
  (value) => [value, LABELS[value]] as const,
);
