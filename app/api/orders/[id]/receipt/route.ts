import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  MAX_RECEIPT_BYTES,
  RECEIPT_BUCKET,
  sniffReceipt,
} from "@/lib/receipts";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * رفع إيصال التحويل.
 *
 * الرابط يحمل معرّف الطلب (UUID عشوائي) وهو بمثابة رابط سرّي لضيف بلا حساب —
 * نفس نموذج صفحة الطلب. ولتضييق ما يمكن فعله بهذا الرابط:
 *   • الرفع مسموح لطلب تحويل واحد ما زال «بانتظار التأكيد».
 *   • مرّة واحدة فقط؛ لا استبدال بعد الرفع (وإلا أمكن تبديل الإيصال بعد أن
 *     يكون المدير قد عاينه وقبل أن يغيّر الحالة).
 *   • الحجم يُرفض من الترويسة قبل قراءة الجسم إلى الذاكرة.
 *   • النوع يُستنتج من بايتات الملف لا من ادّعاء العميل.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(clientKey(request, "receipt"), 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة." },
      { status: 429, headers: { "retry-after": String(limited.retryAfter) } },
    );
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "طلب غير معروف." }, { status: 400 });
  }

  // الرفض قبل استدعاء formData: بدونه يُحمَّل الجسم كاملاً إلى الذاكرة أولاً،
  // وهذا مسار مفتوح بلا مصادقة — أي طلب ضخم واحد يكفي لاستنزافها.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_RECEIPT_BYTES + 4096) {
    return NextResponse.json(
      { error: "حجم الملف يتجاوز 5 ميغابايت." },
      { status: 413 },
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "التخزين غير مهيّأ؛ أضف مفاتيح Supabase." },
      { status: 503 },
    );
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, status, payment_method, receipt_path")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      status: string;
      payment_method: string;
      receipt_path: string | null;
    }>();

  if (!order) {
    return NextResponse.json({ error: "طلب غير معروف." }, { status: 404 });
  }
  if (order.payment_method !== "transfer") {
    return NextResponse.json(
      { error: "هذا الطلب ليس بطريقة التحويل." },
      { status: 400 },
    );
  }
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "لم يعد بالإمكان تعديل هذا الطلب." },
      { status: 409 },
    );
  }
  if (order.receipt_path) {
    return NextResponse.json(
      { error: "وصل إيصال لهذا الطلب مسبقاً. تواصل معنا لتعديله." },
      { status: 409 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "لم يصل أي ملف." }, { status: 400 });
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return NextResponse.json(
      { error: "حجم الملف يتجاوز 5 ميغابايت." },
      { status: 413 },
    );
  }

  const buffer = await file.arrayBuffer();
  const sniffed = sniffReceipt(new Uint8Array(buffer.slice(0, 16)));
  if (!sniffed) {
    return NextResponse.json(
      { error: "الصيغة غير مدعومة. أرسل صورة JPG أو PNG أو WEBP أو ملف PDF." },
      { status: 415 },
    );
  }

  const path = `${id}/receipt.${sniffed.ext}`;
  const { error: uploadError } = await admin.storage
    .from(RECEIPT_BUCKET)
    .upload(path, buffer, { contentType: sniffed.mime, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: "تعذّر رفع الإيصال." }, { status: 500 });
  }

  const { error: linkError } = await admin
    .from("orders")
    .update({ receipt_path: path })
    .eq("id", id)
    .is("receipt_path", null);

  if (linkError) {
    // لا نترك ملفاً يتيماً لا يشير إليه أي طلب
    await admin.storage.from(RECEIPT_BUCKET).remove([path]);
    return NextResponse.json({ error: "تعذّر ربط الإيصال بالطلب." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
