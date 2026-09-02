import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * الوسيط يتأكّد من وجود جلسة فقط. العضوية في جدول `admins` هي ما يمنح
 * الصلاحية فعلاً، وسياسات الصفوف تفرضها على مستوى قاعدة البيانات — هذا الفحص
 * لإظهار رسالة مفهومة بدل صفحة فارغة.
 */
export async function requireAdmin(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      reason:
        "Supabase غير مهيّأ. أضف NEXT_PUBLIC_SUPABASE_URL وNEXT_PUBLIC_SUPABASE_ANON_KEY إلى .env.local.",
    };
  }

  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    return {
      ok: false,
      reason:
        "تعذّر التحقّق من الصلاحية. تأكّد من تشغيل الهجرات في supabase/migrations.",
    };
  }
  if (!data) {
    return {
      ok: false,
      reason:
        "هذا الحساب ليس مديراً. أضف معرّفه إلى جدول admins من لوحة Supabase.",
    };
  }
  return { ok: true };
}

export function AdminNotice({ reason }: { reason: string }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="mb-2 text-lg font-bold">لوحة الإدارة غير متاحة</h1>
        <p className="text-sm leading-relaxed text-muted">{reason}</p>
      </div>
    </main>
  );
}
