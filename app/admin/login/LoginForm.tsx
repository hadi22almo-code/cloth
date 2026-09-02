"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * `next` يصل من الرابط، فهو مدخل غير موثوق.
 * تمريره كما هو إلى location.assign يفتح توجيهاً مفتوحاً: رابط يبدو أنه صفحة
 * دخول المتجر يقذف المدير إلى موقع خارجي **بعد** دخول ناجح — أرضية مثالية
 * للتصيّد. نقبل مسارات الإدارة الداخلية وحدها.
 */
function safeNext(raw: string | null): string {
  const fallback = "/admin/orders";
  if (!raw) return fallback;
  // "//evil.com" و"https://evil.com" و"\evil.com" كلها مسارات خارجية
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallback;
  }
  return raw.startsWith("/admin") ? raw : fallback;
}

function Form() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase غير مهيّأ.");
      setBusy(false);
      return;
    }

    const form = new FormData(e.currentTarget);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (authError) {
      setError("بيانات الدخول غير صحيحة.");
      setBusy(false);
      return;
    }

    /*
     * تنقّل كامل لا router.push: الأخير يعيد استخدام تخطيط /admin الذي صُيّر
     * قبل وجود الجلسة، فيبقى شريط التنقّل مخفياً حتى إعادة تحميل يدوية.
     * تبدّل حالة المصادقة يستحق مستنداً جديداً.
     */
    window.location.assign(safeNext(params.get("next")));
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">البريد الإلكتروني</span>
        <input
          name="email"
          type="email"
          required
          dir="ltr"
          autoComplete="email"
          className={`${inputClass} text-start`}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">كلمة المرور</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-1 rounded-xl bg-accent px-4 py-2.5 font-bold text-accent-contrast disabled:opacity-60"
      >
        {busy ? "جارٍ الدخول…" : "دخول"}
      </button>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
      <Form />
    </Suspense>
  );
}
