import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

// صفحات الإدارة تخصّ مستخدماً بعينه: لا تُصيَّر مسبقاً ولا تُخزَّن أبداً
export const dynamic = "force-dynamic";


export const metadata: Metadata = { title: "لوحة الإدارة — قرص الألوان" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  return (
    <div className="min-h-screen">
      {user && (
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
            <span className="font-bold">لوحة الإدارة</span>
            <nav className="flex gap-3 text-sm">
              <Link href="/admin/orders" className="text-muted hover:text-foreground">
                الطلبات
              </Link>
              <Link href="/admin/products" className="text-muted hover:text-foreground">
                المنتجات
              </Link>
              <Link href="/" className="text-muted hover:text-foreground">
                المتجر
              </Link>
            </nav>
            <div className="ms-auto flex items-center gap-3">
              <span className="text-xs text-muted">
                <bdi>{user.email}</bdi>
              </span>
              <SignOutButton />
            </div>
          </div>
        </header>
      )}
      {children}
    </div>
  );
}
