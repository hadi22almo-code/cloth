"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReceiptUpload({
  orderId,
  hasReceipt,
}: {
  orderId: string;
  hasReceipt: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(hasReceipt);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const body = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/orders/${orderId}/receipt`, {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "تعذّر رفع الإيصال.");
        setBusy(false);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <p className="rounded-lg border border-border bg-background p-3 text-sm text-accent">
        وصل الإيصال ✓ سنراجعه ونؤكّد الطلب قريباً.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label className="text-sm font-semibold">أرفق صورة الإيصال</label>
      <input
        type="file"
        name="file"
        required
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="rounded-lg border border-border bg-background p-2 text-sm file:me-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:text-foreground"
      />
      <p className="text-xs text-muted">JPG أو PNG أو WEBP أو PDF، بحد 5 ميغابايت.</p>

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-xl bg-accent px-4 py-2 font-bold text-accent-contrast disabled:opacity-60"
      >
        {busy ? "جارٍ الرفع…" : "رفع الإيصال"}
      </button>
    </form>
  );
}
