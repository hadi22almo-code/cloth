/**
 * إعدادات Supabase وحالتها.
 *
 * المشروع يعمل كاملاً بلا Supabase: طبقة الاستعلام ترجع إلى البيانات المحلية
 * في `data/products.ts`. بمجرّد إضافة المفاتيح إلى `.env.local` يتحوّل المصدر
 * إلى قاعدة البيانات بلا أي تعديل في الكود.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** هل يمكن القراءة من قاعدة البيانات؟ */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * مفتاح الخدمة يتخطّى سياسات الصفوف، فلا يُقرأ إلا على الخادم ولا يُصدَّر
 * بادئة NEXT_PUBLIC أبداً.
 */
export function serviceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

/** هل يمكن الكتابة (إنشاء الطلبات، خصم المخزون)؟ */
export function canWriteOrders(): boolean {
  return Boolean(SUPABASE_URL && serviceRoleKey());
}
