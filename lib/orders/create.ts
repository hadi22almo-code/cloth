import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/shop-config";
import type { CustomerInput } from "./schema";
import type { Quote } from "./quote";

export interface CreatedOrder {
  id: string;
  reference: string;
}

export type CreateResult =
  | { ok: true; order: CreatedOrder }
  | { ok: false; status: number; error: string };

/** ما تعيده الدالة في قاعدة البيانات. */
interface PlaceOrderRow {
  order_id: string;
  order_reference: string;
}

/** رمز الخطأ الذي ترفعه الدالة عند نقص المخزون. */
const INSUFFICIENT_STOCK = "P0001";

/** PostgREST حين لا يجد الدالة في مخطّطه. */
const FUNCTION_MISSING = new Set(["PGRST202", "42883"]);

/**
 * يسجّل الطلب.
 *
 * الإدراج وخصم المخزون يجريان داخل **معاملة واحدة** في قاعدة البيانات عبر
 * `place_order`. الترتيب السابق (إدراج ثم خصم من التطبيق) كان يترك ثغرة:
 * طلبان متزامنان يمرّان من فحص التوفّر، ثم يفشل أحد الخصمين بعد أن يكون
 * الطلب قد سُجّل — فيخرج العميل بطلب مؤكَّد لبضاعة غير موجودة.
 */
export async function placeOrder(
  customer: CustomerInput,
  quote: Quote,
  paymentMethod: PaymentMethod,
  walletId?: string,
): Promise<CreateResult> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: false, status: 503, error: "قاعدة البيانات غير مهيّأة." };
  }

  const { data, error } = await admin.rpc("place_order", {
      p_customer: {
        name: customer.name,
        phone: customer.phone,
        city: customer.city,
        address: customer.address,
        notes: customer.notes ?? "",
      },
      p_payment: paymentMethod,
      p_wallet: walletId ?? "",
      p_currency: quote.currency,
      p_subtotal: quote.subtotal,
      p_shipping: quote.shipping,
      p_total: quote.total,
      p_items: quote.lines.map((l) => ({
        variant_id: l.variantId,
        size_label: l.sizeLabel,
        quantity: l.quantity,
        unit_price: l.unitPrice,
      })),
  });

  if (error) {
    if (error.code === INSUFFICIENT_STOCK) {
      // نفدت الكمية بين لحظة التسعير ولحظة التسجيل
      return { ok: false, status: 409, error: error.message };
    }
    if (FUNCTION_MISSING.has(error.code ?? "")) {
      // تشخيص صريح بدل رسالة عامة: الهجرة 0003 لم تُشغَّل على هذه القاعدة
      return {
        ok: false,
        status: 503,
        error:
          "قاعدة البيانات ينقصها إجراء تسجيل الطلبات. شغّل supabase/migrations/0003_iraq.sql على هذا المشروع.",
      };
    }
    return { ok: false, status: 500, error: "تعذّر تسجيل الطلب." };
  }

  // العميل غير مولَّد الأنواع، فالدالة تعيد unknown
  const row = (data as PlaceOrderRow[] | null)?.[0];
  if (!row) {
    return { ok: false, status: 500, error: "تعذّر تسجيل الطلب." };
  }

  return {
    ok: true,
    order: { id: row.order_id, reference: row.order_reference },
  };
}
