"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Price } from "@/components/ui/Price";
import { CURRENCY, FREE_SHIPPING_OVER, MAX_QTY_PER_ITEM } from "@/lib/shop-config";
import { cartTotals, lineKey, useCart } from "@/lib/store/cart";

export function CartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const panelRef = useRef<HTMLDivElement>(null);

  const { subtotal, shipping, total } = cartTotals(lines);

  /**
   * نافذة مشروطة صحيحة تحتاج ثلاثة أشياء لا واحداً:
   *   • Escape يغلق (وكان موجوداً)
   *   • التركيز محبوس داخلها، وإلا خرج المستخدم بضغطتَي Tab إلى محتوى
   *     محجوب بصرياً خلف الحاجب
   *   • التركيز يعود إلى الزر الذي فتحها عند الإغلاق
   * ونمنع تمرير الصفحة خلفها فعلياً — كان تعليقاً بلا كود.
   */
  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusablesIn = (root: HTMLElement) =>
      [
        ...root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = focusablesIn(panel);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey, true);
    panelRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        inert={!open}
        className={[
          "fixed inset-0 z-40 bg-black/60 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal={open}
        /*
         * اللوح المغلق يُزاح بالتحويل فقط، فيبقى في ترتيب Tab عند x=-368
         * خارج الشاشة. inert يُخرجه منه.
         */
        inert={!open}
        aria-label="سلة المشتريات"
        tabIndex={-1}
        className={[
          "fixed inset-y-0 end-0 z-50 flex w-[min(24rem,100vw)] flex-col",
          "border-s border-border bg-surface shadow-2xl transition-transform duration-300",
          // التحويلات لا تنقلب تلقائياً في RTL، فنصرّح بالاتجاهين
          open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full",
        ].join(" ")}
      >
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-bold">سلة المشتريات</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق السلة"
            className="min-h-11 rounded-lg border border-border px-4 py-2.5 text-sm hover:border-muted focus-visible:outline-2 focus-visible:outline-accent"
          >
            إغلاق
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {lines.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">
              السلة فارغة. اختر لوناً من القرص ثم أضفه.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {lines.map((line) => {
                const key = lineKey(line);
                return (
                  <li
                    key={key}
                    className="flex gap-3 rounded-xl border border-border p-3"
                  >
                    <span
                      aria-hidden
                      className="size-14 shrink-0 rounded-lg border border-border"
                      style={{ backgroundColor: line.colorHex }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {line.nameAr}
                      </p>
                      <p className="text-xs text-muted">
                        {line.colorNameAr} · مقاس <bdi>{line.sizeLabel}</bdi>
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        {/* في RTL أول عنصر في DOM يقع يميناً: «+» يميناً و«−» يساراً */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="زيادة الكمية"
                            disabled={line.quantity >= MAX_QTY_PER_ITEM}
                            onClick={() => setQuantity(key, line.quantity + 1)}
                            className="size-11 rounded-md border border-border text-lg hover:border-muted focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
                          >
                            +
                          </button>
                          <span className="w-8 text-center text-sm">
                            <bdi>{line.quantity}</bdi>
                          </span>
                          <button
                            type="button"
                            aria-label="إنقاص الكمية"
                            onClick={() => setQuantity(key, line.quantity - 1)}
                            className="size-11 rounded-md border border-border text-lg hover:border-muted focus-visible:outline-2 focus-visible:outline-accent"
                          >
                            −
                          </button>
                        </div>
                        <Price
                          value={line.unitPrice * line.quantity}
                          currency={line.currency}
                          className="text-sm font-semibold"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(key)}
                      aria-label={`حذف ${line.colorNameAr}`}
                      className="-me-1 flex min-h-11 min-w-11 items-center justify-center self-start rounded-lg text-xs text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      حذف
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <footer className="border-t border-border p-4">
            <dl className="mb-3 flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">المجموع الفرعي</dt>
                <dd>
                  <Price value={subtotal} currency={CURRENCY} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">الشحن</dt>
                <dd>
                  {shipping === 0 ? (
                    "مجاني"
                  ) : (
                    <Price value={shipping} currency={CURRENCY} />
                  )}
                </dd>
              </div>
              <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-bold">
                <dt>الإجمالي</dt>
                <dd className="text-accent">
                  <Price value={total} currency={CURRENCY} />
                </dd>
              </div>
            </dl>

            {shipping > 0 && (
              <p className="mb-3 text-xs text-muted">
                أضف بقيمة{" "}
                <Price
                  value={FREE_SHIPPING_OVER - subtotal}
                  currency={CURRENCY}
                />{" "}
                للحصول على شحن مجاني.
              </p>
            )}

            <Link
              href="/checkout"
              className="block rounded-xl bg-accent px-4 py-3 text-center font-bold text-accent-contrast hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              إتمام الطلب
            </Link>
          </footer>
        )}
      </div>
    </>
  );
}
