"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await createSupabaseBrowserClient()?.auth.signOut();
        // تنقّل كامل بنفس سبب صفحة الدخول: التخطيط يجب أن يُصيَّر بلا جلسة
        window.location.assign("/admin/login");
      }}
      className="rounded-lg border border-border px-3 py-1 text-xs hover:border-muted disabled:opacity-60"
    >
      خروج
    </button>
  );
}
