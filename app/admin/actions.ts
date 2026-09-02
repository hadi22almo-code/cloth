"use server";

import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { ORDER_STATUSES } from "@/lib/orders/status";
import { MAX_IMAGE_BYTES, PRODUCT_BUCKET } from "@/lib/product-images";
import { sniffReceipt } from "@/lib/receipts";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

/**
 * كل إجراء يمرّ بعميل **جلسة المستخدم** لا بمفتاح الخدمة: سياسات الصفوف
 * (`is_admin()`) هي الحارس الفعلي، فحتى لو استُدعي الإجراء من غير مدير رفضته
 * قاعدة البيانات نفسها.
 */

export interface ActionState {
  ok?: string;
  error?: string;
}

/*
 * ملاحظة: ملف "use server" لا يُصدّر إلا دوالّ غير متزامنة. الأنواع تُمحى عند
 * الترجمة فتمرّ، لكن أي ثابت مُصدَّر يُسقط الصفحة عند الإقلاع.
 */

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

/**
 * يحوّل أي فشل إلى رسالة عربية مفهومة.
 *
 * قبل هذا كان `z.parse` يرمي خطأً غير مُمسَك فتنهار لوحة الإدارة كلها إلى
 * شاشة "Application error" إنجليزية — أي أن الرسائل العربية المكتوبة في
 * السكيمة لم تكن تصل المستخدم أبداً.
 */
function toMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "بيانات غير صالحة.";
  }
  const pg = error as PostgrestLikeError;
  switch (pg?.code) {
    case "23505":
      return "هذا المعرّف مستخدم من قبل. اختر معرّفاً آخر.";
    case "23514":
      return "قيمة خارج المدى المسموح.";
    case "42501":
      return "لا تملك صلاحية هذا الإجراء.";
    case "P0001":
      return pg.message ?? "تعذّر تنفيذ العملية.";
    case "P0002":
      return "العنصر غير موجود.";
    case "PGRST202":
      // تشخيص صريح بدل رسالة PostgREST الإنجليزية
      return "قاعدة البيانات ينقصها إجراء تغيير الحالة. شغّل supabase/migrations/0004_admin.sql.";
    default:
      return pg?.message ?? "تعذّر حفظ التغيير.";
  }
}

async function client() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase غير مهيّأ.");
  return supabase;
}

function refresh() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/orders");
  revalidatePath("/");
}

/** يغلّف كل إجراء: يمسك الأخطاء ويعيد رسالة نجاح صريحة بدل الصمت. */
async function run(work: () => Promise<string>): Promise<ActionState> {
  try {
    const ok = await work();
    refresh();
    return { ok };
  } catch (error) {
    return { error: toMessage(error) };
  }
}

/** يرفع خطأ PostgREST كاستثناء ليمرّ بمترجم الرسائل نفسه. */
function must(error: PostgrestLikeError | null) {
  if (error) throw error;
}

/* ══════════════════ الطلبات ══════════════════ */

const statusSchema = z.enum(ORDER_STATUSES);

export async function updateOrderStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const id = z.string().uuid().parse(formData.get("id"));
    const status = statusSchema.parse(formData.get("status"));

    /*
     * عبر الدالة لا بتحديث مباشر: الإلغاء يجب أن يعيد البضاعة إلى الرف،
     * والتراجع عنه يعيد حجزها — والاثنان مع تغيير الحالة في معاملة واحدة.
     */
    const supabase = await client();
    const { error } = await supabase.rpc("set_order_status", {
      p_order_id: id,
      p_status: status,
    });
    must(error);

    return status === "cancelled"
      ? "أُلغي الطلب وأُعيد المخزون."
      : "حُفظت الحالة.";
  });
}

/* ══════════════════ المنتجات ══════════════════ */

const productSchema = z.object({
  id: z.string().uuid(),
  name_ar: z.string().trim().min(2, "الاسم قصير جداً").max(120),
  description_ar: z.string().trim().max(600, "الوصف طويل جداً"),
  price: z.coerce.number().min(0, "السعر لا يكون سالباً").max(1_000_000),
});

export async function updateProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const input = productSchema.parse({
      id: formData.get("id"),
      name_ar: formData.get("name_ar"),
      description_ar: formData.get("description_ar"),
      price: formData.get("price"),
    });

    const supabase = await client();
    const { error } = await supabase
      .from("products")
      .update({
        name_ar: input.name_ar,
        description_ar: input.description_ar,
        price: input.price,
      })
      .eq("id", input.id);
    must(error);
    return "حُفظت بيانات المنتج.";
  });
}

const hexMessage = "اللون يكتب بصيغة ست خانات مثل ‎#1a2b3c";

const variantSchema = z.object({
  id: z.string().uuid(),
  color_name_ar: z.string().trim().min(1, "اسم اللون مطلوب").max(60),
  color_hex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, hexMessage),
  stock: z.coerce
    .number()
    .int("المخزون عدد صحيح")
    .min(0, "المخزون لا يكون سالباً")
    .max(100_000),
});

export async function updateVariant(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const input = variantSchema.parse({
      id: formData.get("id"),
      color_name_ar: formData.get("color_name_ar"),
      color_hex: formData.get("color_hex"),
      stock: formData.get("stock"),
    });

    const supabase = await client();
    const { error } = await supabase
      .from("product_variants")
      .update({
        color_name_ar: input.color_name_ar,
        color_hex: input.color_hex,
        stock: input.stock,
      })
      .eq("id", input.id);
    must(error);
    return `حُفظ اللون ${input.color_name_ar}.`;
  });
}

const newVariantSchema = z.object({
  product_id: z.string().uuid(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,40}$/, "المعرّف: حروف لاتينية صغيرة وأرقام وشرطات"),
  color_name_ar: z.string().trim().min(1, "اسم اللون مطلوب").max(60),
  color_hex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, hexMessage),
  stock: z.coerce.number().int().min(0, "المخزون لا يكون سالباً").max(100_000),
  position: z.coerce.number().int().min(0).max(999),
});

export async function addVariant(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const input = newVariantSchema.parse({
      product_id: formData.get("product_id"),
      slug: formData.get("slug"),
      color_name_ar: formData.get("color_name_ar"),
      color_hex: formData.get("color_hex"),
      stock: formData.get("stock"),
      position: formData.get("position"),
    });

    const supabase = await client();
    // select() يجعل قيد التفرّد يعود كخطأ صريح بدل نجاح صامت بلا إدراج
    const { error } = await supabase
      .from("product_variants")
      .insert(input)
      .select("id")
      .single();
    must(error);
    return `أُضيف اللون ${input.color_name_ar}.`;
  });
}

export async function deleteVariant(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const id = z.string().uuid().parse(formData.get("id"));
    const supabase = await client();
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", id);
    must(error);
    return "حُذف اللون.";
  });
}

const sizeSchema = z.object({
  id: z.string().uuid(),
  stock: z.coerce
    .number()
    .int("المخزون عدد صحيح")
    .min(0, "المخزون لا يكون سالباً")
    .max(100_000),
});

export async function updateSizeStock(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const input = sizeSchema.parse({
      id: formData.get("id"),
      stock: formData.get("stock"),
    });

    const supabase = await client();
    const { error } = await supabase
      .from("product_sizes")
      .update({ stock: input.stock })
      .eq("id", input.id);
    must(error);
    return "حُفظ المقاس.";
  });
}

/* ══════════════════ صور الألوان ══════════════════ */

/**
 * رفع صورة اللون.
 *
 * الرفع بمفتاح الخدمة لأن مخزن Supabase لا يقبل سياسات كتابة مبنية على
 * `is_admin()`. ولذلك نتحقّق من الصلاحية هنا صراحةً قبل أي شيء — لا نعتمد
 * على سياسات الصفوف كما تفعل بقية الإجراءات.
 */
export async function uploadVariantImage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const id = z.string().uuid().parse(formData.get("id"));

    const supabase = await client();
    const { data: allowed } = await supabase.rpc("is_admin");
    if (!allowed) throw { code: "42501" };

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw { message: "اختر ملف صورة أولاً." };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw { message: "حجم الصورة يتجاوز 5 ميغابايت." };
    }

    const buffer = await file.arrayBuffer();
    // النوع من بايتات الملف لا من ادّعاء المتصفّح
    const sniffed = sniffReceipt(new Uint8Array(buffer.slice(0, 16)));
    if (!sniffed || sniffed.mime === "application/pdf") {
      throw { message: "الصيغة غير مدعومة. أرسل صورة JPG أو PNG أو WEBP." };
    }

    const admin = createSupabaseAdminClient();
    if (!admin) throw { message: "التخزين غير مهيّأ." };

    // الطابع الزمني يتخطّى ذاكرة المتصفّح عند استبدال الصورة
    const path = `variants/${id}-${Date.now()}.${sniffed.ext}`;
    const { error: upErr } = await admin.storage
      .from(PRODUCT_BUCKET)
      .upload(path, buffer, { contentType: sniffed.mime, upsert: true });
    if (upErr) throw { message: "تعذّر رفع الصورة." };

    const { data: pub } = admin.storage.from(PRODUCT_BUCKET).getPublicUrl(path);

    // نحذف القديمة بعد نجاح الجديدة، لا قبله
    const { data: previous } = await admin
      .from("product_variants")
      .select("image_url")
      .eq("id", id)
      .maybeSingle<{ image_url: string | null }>();

    const { error } = await supabase
      .from("product_variants")
      .update({ image_url: pub.publicUrl })
      .eq("id", id);
    must(error);

    const oldPath = previous?.image_url?.split(`/${PRODUCT_BUCKET}/`)[1];
    if (oldPath) await admin.storage.from(PRODUCT_BUCKET).remove([oldPath]);

    return "رُفعت الصورة.";
  });
}

export async function removeVariantImage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const id = z.string().uuid().parse(formData.get("id"));

    const supabase = await client();
    const { data: current } = await supabase
      .from("product_variants")
      .select("image_url")
      .eq("id", id)
      .maybeSingle<{ image_url: string | null }>();

    const { error } = await supabase
      .from("product_variants")
      .update({ image_url: null })
      .eq("id", id);
    must(error);

    const path = current?.image_url?.split(`/${PRODUCT_BUCKET}/`)[1];
    if (path) createSupabaseAdminClient()?.storage.from(PRODUCT_BUCKET).remove([path]);

    return "حُذفت الصورة؛ عاد اللون إلى المجسّم.";
  });
}
