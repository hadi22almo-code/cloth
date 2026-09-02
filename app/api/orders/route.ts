import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { placeOrder } from "@/lib/orders/create";
import { buildQuote } from "@/lib/orders/quote";
import { createOrderSchema } from "@/lib/orders/schema";
import { WALLETS } from "@/lib/shop-config";

/** أقصى حجم لجسم الطلب. سلة من ٣٠ سطراً ونموذج عميل لا تتجاوز عشرات الكيلوبايتات. */
const MAX_BODY_BYTES = 64 * 1024;

/** ١٠ طلبات في الدقيقة لكل عنوان — أكثر بكثير مما يحتاجه مشترٍ حقيقي. */
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

/**
 * إنشاء الطلب.
 *
 * الطريقتان المتاحتان في العراق: الدفع عند الاستلام، والتحويل إلى محفظة مع
 * رفع الإيصال لاحقاً. في الحالتين يُحجز المخزون ذرّياً مع تسجيل الطلب،
 * ومراجعة الإيصال تتم من لوحة الإدارة.
 */
export async function POST(request: Request) {
  /*
   * المسار مفتوح بلا مصادقة، وكل طلب ناجح يخصم من المخزون. بدون حدّ، سكربت
   * واحد يستنزف مخزون لون كامل ويُغرق لوحة الإدارة بطلبات وهمية.
   */
  const limited = rateLimit(
    clientKey(request, "orders"),
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "طلبات كثيرة في وقت قصير. انتظر قليلاً ثم أعد المحاولة." },
      { status: 429, headers: { "retry-after": String(limited.retryAfter) } },
    );
  }

  // الرفض من الترويسة قبل قراءة الجسم إلى الذاكرة
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "حجم الطلب كبير جداً." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." },
      { status: 400 },
    );
  }

  const { items, customer, paymentMethod, walletId } = parsed.data;

  if (paymentMethod === "transfer") {
    if (WALLETS.length === 0) {
      return NextResponse.json(
        { error: "التحويل غير مفعّل حالياً؛ استخدم الدفع عند الاستلام." },
        { status: 503 },
      );
    }
    if (!walletId || !WALLETS.some((w) => w.id === walletId)) {
      return NextResponse.json(
        { error: "اختر محفظة صحيحة للتحويل." },
        { status: 400 },
      );
    }
  }

  // إعادة حساب كل سعر من قاعدة البيانات: ما يرسله العميل بيانات لا حقيقة
  const quoted = await buildQuote(items);
  if (!quoted.ok) {
    return NextResponse.json({ error: quoted.error }, { status: quoted.status });
  }

  const created = await placeOrder(
    customer,
    quoted.quote,
    paymentMethod,
    paymentMethod === "transfer" ? walletId : undefined,
  );
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: created.status });
  }

  return NextResponse.json({
    id: created.order.id,
    reference: created.order.reference,
    total: quoted.quote.total,
  });
}
