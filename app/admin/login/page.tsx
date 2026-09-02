import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "دخول الإدارة" };

export default function AdminLoginPage() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-md place-items-center px-4">
      <div className="w-full rounded-2xl border border-border bg-surface p-6">
        <h1 className="mb-1 text-xl font-bold">لوحة الإدارة</h1>
        <p className="mb-5 text-sm text-muted">
          الدخول بحساب مسجَّل في جدول المدراء.
        </p>

        {isSupabaseConfigured ? (
          <LoginForm />
        ) : (
          <p className="rounded-lg border border-border p-3 text-sm leading-relaxed text-muted">
            المصادقة تحتاج مفاتيح Supabase في <bdi>.env.local</bdi>:{" "}
            <bdi>NEXT_PUBLIC_SUPABASE_URL</bdi> و{" "}
            <bdi>NEXT_PUBLIC_SUPABASE_ANON_KEY</bdi>.
          </p>
        )}
      </div>
    </main>
  );
}
