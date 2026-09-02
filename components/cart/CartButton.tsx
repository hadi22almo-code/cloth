"use client";

import { cartCount, useCart, useCartHydrated } from "@/lib/store/cart";

export function CartButton({ onClick }: { onClick: () => void }) {
  const lines = useCart((s) => s.lines);
  const hydrated = useCartHydrated();
  const count = cartCount(lines);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        hydrated && count > 0 ? `السلة، ${count} قطعة` : "سلة المشتريات"
      }
      className="pointer-events-auto relative flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2.5 text-sm backdrop-blur transition hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span aria-hidden>🛒</span>
      <span>السلة</span>
      {/* لا نعرض العدد قبل استرجاع التخزين المحلي حتى لا يتعارض الترطيب */}
      {hydrated && count > 0 && (
        <span className="grid size-5 place-items-center rounded-full bg-accent text-xs font-bold text-accent-contrast">
          <bdi>{count}</bdi>
        </span>
      )}
    </button>
  );
}
