"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Price } from "@/components/ui/Price";
import { CURRENCY, type PaymentMethod, type Wallet } from "@/lib/shop-config";
import { cartTotals, lineKey, useCart, useCartHydrated } from "@/lib/store/cart";

export function CheckoutForm({
  wallets,
  ordersEnabled,
}: {
  wallets: Wallet[];
  ordersEnabled: boolean;
}) {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const hydrated = useCartHydrated();

  const [method, setMethod] = useState<PaymentMethod>("cod");
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { subtotal, shipping, total } = cartTotals(lines);
  const transferEnabled = wallets.length > 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      items: lines.map((l) => ({
        productSlug: l.productSlug,
        variantSlug: l.variantSlug,
        sizeLabel: l.sizeLabel,
        quantity: l.quantity,
      })),
      customer: {
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        city: String(form.get("city") ?? ""),
        address: String(form.get("address") ?? ""),
        notes: String(form.get("notes") ?? ""),
      },
      paymentMethod: method,
      ...(method === "transfer" ? { walletId } : {}),
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "تعذّر إتمام الطلب.");
        setSubmitting(false);
        return;
      }

      clear();
      router.push(`/order/${data.id}`);
    } catch {
      setError("تعذّر الاتصال بالخادم.");
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return <p className="py-16 text-center text-sm text-muted">جارٍ تحميل السلة…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted">السلة فارغة.</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 font-bold text-accent-contrast"
        >
          العودة إلى القرص
        </Link>
      </div>
    );
  }

  // outline-none وحده يترك المؤشّر حدّاً بعرض بكسل واحد يعتمد على اللون فقط
  const inputClass =
    "w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_20rem]">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">الاسم الكامل</span>
            <input name="name" required autoComplete="name" className={inputClass} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">رقم الهاتف</span>
            <input
              name="phone"
              required
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="07xxxxxxxxx"
              // داخل dir="ltr" يعني text-start محاذاةً لليسار، فينفرد هذا
              // الحقل عن بقية النموذج العربي. text-end يعيده لحافة البداية.
              className={`${inputClass} text-end`}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">المحافظة / المدينة</span>
          <input name="city" required autoComplete="address-level2" className={inputClass} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">العنوان بالتفصيل</span>
          <textarea
            name="address"
            required
            rows={3}
            autoComplete="street-address"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">
            ملاحظات <span className="font-normal text-muted">(اختياري)</span>
          </span>
          <textarea name="notes" rows={2} className={inputClass} />
        </label>

        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-2 text-sm font-semibold">طريقة الدفع</legend>

          <div className="flex flex-col gap-3">
            {/* py-2.5 يرفع صفّ الاختيار إلى ٤٤ بكسل: كان ٢٠ والفجوة بينهما ١٢ */}
            <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1">
              <input
                type="radio"
                name="method"
                checked={method === "cod"}
                onChange={() => setMethod("cod")}
                className="accent-accent"
              />
              <span className="text-sm">الدفع عند الاستلام</span>
            </label>

            {/*
              الخيار غير المفعّل كان يعرض «لم تُضبط أرقام المحافظ بعد» — رسالة
              موجّهة لصاحب المتجر تفضح حالة الإعداد أمام الزبون. نخفيه بدلاً
              من ذلك: ما لا يعمل لا يُعرض.
            */}
            {transferEnabled && (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1">
                <input
                  type="radio"
                  name="method"
                  checked={method === "transfer"}
                  onChange={() => setMethod("transfer")}
                  className="accent-accent"
                />
                <span className="text-sm">تحويل إلى محفظة</span>
              </label>
            )}

            {method === "transfer" && transferEnabled && (
              <div className="ms-7 flex flex-col gap-2 rounded-lg border border-border p-3">
                {wallets.map((w) => (
                  <label
                    key={w.id}
                    className="flex min-h-11 cursor-pointer items-center gap-3 py-1"
                  >
                    <input
                      type="radio"
                      name="wallet"
                      checked={walletId === w.id}
                      onChange={() => setWalletId(w.id)}
                      className="accent-accent"
                    />
                    <span className="text-sm">{w.nameAr}</span>
                    <bdi className="ms-auto font-mono text-sm text-accent">
                      {w.number}
                    </bdi>
                  </label>
                ))}
                <p className="text-xs leading-relaxed text-muted">
                  حوّل مبلغ <Price value={total} currency={CURRENCY} /> إلى الرقم
                  أعلاه، ثم أكّد الطلب وارفع صورة الإيصال في الصفحة التالية.
                </p>
              </div>
            )}
          </div>
        </fieldset>

        {!ordersEnabled && (
          <p className="rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed text-muted">
            حفظ الطلبات يحتاج مفاتيح Supabase في <bdi>.env.local</bdi>.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-200"
          >
            {error}
          </p>
        )}

        {/*
          على الهاتف يقع ملخّص الطلب تحت الطيّة والزر فوقها، فيؤكّد الزبون
          طلبه دون أن يرى كم سيدفع. هذا السطر يضع الإجمالي في طريقه.
        */}
        <div className="flex items-center justify-between rounded-xl border border-accent/40 bg-surface px-4 py-3 md:hidden">
          <span className="text-sm text-muted">الإجمالي</span>
          <span className="text-lg font-bold text-accent">
            <Price value={total} currency={CURRENCY} />
          </span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-xl bg-accent px-4 py-3 font-bold text-accent-contrast transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "جارٍ الإرسال…" : "تأكيد الطلب"}
        </button>
      </form>

      <aside className="h-fit rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-bold">ملخّص الطلب</h2>
        <ul className="flex flex-col gap-2 border-b border-border pb-3">
          {lines.map((l) => (
            <li key={lineKey(l)} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className="size-6 shrink-0 rounded border border-border"
                style={{ backgroundColor: l.colorHex }}
              />
              <span className="min-w-0 flex-1 truncate">
                {l.colorNameAr} · <bdi>{l.sizeLabel}</bdi> ×{" "}
                <bdi>{l.quantity}</bdi>
              </span>
              <Price value={l.unitPrice * l.quantity} currency={l.currency} />
            </li>
          ))}
        </ul>

        <dl className="mt-3 flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">المجموع الفرعي</dt>
            <dd>
              <Price value={subtotal} currency={CURRENCY} />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">التوصيل</dt>
            <dd>
              {shipping === 0 ? "مجاني" : <Price value={shipping} currency={CURRENCY} />}
            </dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-bold">
            <dt>الإجمالي</dt>
            <dd className="text-accent">
              <Price value={total} currency={CURRENCY} />
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
