/** إعدادات المتجر التجارية في مكان واحد. */

export const STORE_NAME_AR = "قرص الألوان";

/** دينار عراقي. التنسيق في `components/ui/Price.tsx`. */
export const CURRENCY = "IQD";

/** أجرة الشحن الثابتة. */
export const SHIPPING_FLAT = 5_000;

/** الشحن مجاني فوق هذا المجموع. */
export const FREE_SHIPPING_OVER = 100_000;

/** أقصى كمية للقطعة الواحدة في السلة. */
export const MAX_QTY_PER_ITEM = 10;

export function shippingFor(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
}

/* ————— الدفع ————— */

export type PaymentMethod = "cod" | "transfer";

/**
 * القيمة `card` باقية في نوع قاعدة البيانات ولا يمكن حذفها (Postgres لا يدعم
 * إسقاط قيمة enum)، وقد تحملها طلبات سُجّلت قبل التحوّل. عرضها ضمن `else`
 * كان يُظهرها للعميل على أنها تحويل إلى محفظة — لذا تسمية صريحة هنا.
 */
export function paymentMethodLabel(method: string): string {
  switch (method) {
    case "cod":
      return "الدفع عند الاستلام";
    case "transfer":
      return "تحويل إلى محفظة";
    case "card":
      return "بطاقة (طريقة سابقة)";
    default:
      return method;
  }
}

export function paymentMethodShort(method: string): string {
  switch (method) {
    case "cod":
      return "عند الاستلام";
    case "transfer":
      return "تحويل";
    case "card":
      return "بطاقة (سابقة)";
    default:
      return method;
  }
}

export interface Wallet {
  id: string;
  nameAr: string;
  number: string;
}

/**
 * محافظ التحويل. Stripe وبقية بوابات البطاقات العالمية لا تخدم العراق، فالبديل
 * العملي هو التحويل المباشر إلى محفظة ثم رفع الإيصال ومراجعته من لوحة الإدارة.
 *
 * تُضبط الأرقام من `.env.local`؛ المحفظة بلا رقم لا تظهر للعميل، وإن لم تُضبط
 * أي محفظة اختفى خيار التحويل وبقي الدفع عند الاستلام وحده.
 */
export const WALLETS: Wallet[] = [
  {
    id: "zaincash",
    nameAr: "زين كاش",
    number: process.env.NEXT_PUBLIC_ZAINCASH_NUMBER ?? "",
  },
  {
    id: "fastpay",
    nameAr: "فاست باي",
    number: process.env.NEXT_PUBLIC_FASTPAY_NUMBER ?? "",
  },
].filter((w) => w.number.trim().length > 0);

export const isTransferEnabled = WALLETS.length > 0;
