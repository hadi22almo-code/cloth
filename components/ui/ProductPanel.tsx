"use client";

import { useEffect, useRef, useState } from "react";
import type { ColorVariant, Product } from "@/lib/types";
import { Price } from "./Price";

/**
 * لوحة المنتج طبقة DOM عادية فوق الكانفس، لا drei/Html: القميص ثابت قرب
 * منتصف الشاشة في وضع التقريب فلا حاجة لتتبّع نقطة ثلاثية الأبعاد، وهذا يبقي
 * التنسيق داخل شجرة Tailwind وRTL الطبيعية.
 */
export function ProductPanel({
  product,
  variant,
  visible,
  selectedSize,
  onSelectSize,
  onAddToCart,
  compact,
}: {
  product: Product;
  variant: ColorVariant;
  visible: boolean;
  selectedSize: string | null;
  onSelectSize: (label: string) => void;
  onAddToCart: () => void;
  /** الشاشات الضيّقة: نطوي الوصف لتقصر اللوحة فيظهر المنتج خلفها. */
  compact: boolean;
}) {
  const outOfStock = variant.stock <= 0;
  const needsSize = !selectedSize;

  /*
   * الزر كان disabled حين لا مقاس، فيخرج من ترتيب Tab ويُعلنه قارئ الشاشة
   * «غير متاح» — أي أن التعليمة المكتوبة عليه لا تصل من يحتاجها. الآن يبقى
   * فعّالاً ويوجّه المستخدم إلى المقاسات عند الضغط.
   */
  const sizeGroupRef = useRef<HTMLDivElement>(null);
  const [sizeHint, setSizeHint] = useState(false);

  useEffect(() => {
    if (selectedSize) setSizeHint(false);
  }, [selectedSize]);

  function handleBuy() {
    if (needsSize) {
      setSizeHint(true);
      sizeGroupRef.current
        ?.querySelector<HTMLButtonElement>("button:not([disabled])")
        ?.focus();
      return;
    }
    onAddToCart();
  }

  return (
    <aside
      /*
       * opacity-0 لا يزيل العنصر من ترتيب Tab: كان مستخدم لوحة المفاتيح يقع
       * على أزرار مقاسات غير مرئية داخل عنصر aria-hidden — مخالفة ARIA صريحة.
       * inert يعطّل التركيز والأحداث معاً.
       */
      inert={!visible}
      aria-hidden={!visible}
      className={[
        // الهامش التلقائي بدل align-items: مع الأخير يُقصّ فائض اللوحة من
        // الأعلى ولا يمكن التمرير إليه — وهو ما كان يخفي السعر عند التكبير
        "mt-auto sm:my-auto",
        "pointer-events-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border",
        "bg-surface/85 backdrop-blur-md shadow-2xl transition-all duration-300",
        compact ? "p-4" : "p-5",
        visible
          ? "opacity-100 translate-y-0"
          : "pointer-events-none opacity-0 translate-y-3",
      ].join(" ")}
    >
      <h1 className="text-xl font-bold leading-snug">{product.nameAr}</h1>

      <p className="mt-1 text-sm text-muted">
        اللون: <span className="text-foreground">{variant.nameAr}</span>
      </p>

      <p className="mt-3 text-2xl font-bold text-accent">
        <Price value={product.price} currency={product.currency} />
      </p>

      {/* الوصف يطوى على الهاتف: كان يضيف نحو ٦٠ بكسل لارتفاع لوحة تحجب المنتج */}
      {compact ? (
        <details className="mt-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm text-muted marker:text-accent">
            تفاصيل القماش
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {product.descriptionAr}
          </p>
        </details>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {product.descriptionAr}
        </p>
      )}

      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold">المقاس</p>
        <div
          ref={sizeGroupRef}
          role="group"
          aria-label="المقاسات المتاحة"
          className="flex flex-wrap gap-2"
        >
          {product.sizes.map((size) => {
            const disabled = size.stock <= 0;
            const active = size.label === selectedSize;
            return (
              <button
                key={size.label}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => onSelectSize(size.label)}
                className={[
                  // ٤٤ بكسل ارتفاعاً: كانت ٣٤ فقط
                  "min-h-11 min-w-12 rounded-lg border px-3 py-2 text-sm transition",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  disabled
                    // text-muted/40 كان يهبط بالتباين إلى ٢٫٦:١ مع الشطب
                    ? "cursor-not-allowed border-border text-muted line-through opacity-70"
                    : active
                      ? "border-accent bg-accent text-accent-contrast font-semibold"
                      : "border-border hover:border-muted",
                ].join(" ")}
              >
                <bdi>{size.label}</bdi>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        disabled={outOfStock}
        onClick={handleBuy}
        aria-describedby={sizeHint ? "size-hint" : undefined}
        className={[
          "mt-5 min-h-11 w-full rounded-xl px-4 py-3 font-bold transition",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          outOfStock
            ? "cursor-not-allowed bg-surface-2 text-muted"
            : "bg-accent text-accent-contrast hover:brightness-110",
        ].join(" ")}
      >
        {outOfStock ? "غير متوفر حالياً" : "أضف إلى السلة"}
      </button>

      <p
        id="size-hint"
        role="status"
        aria-live="polite"
        className="mt-2 min-h-4 text-xs text-accent"
      >
        {sizeHint ? "اختر المقاس أولاً" : ""}
      </p>

      <p className="mt-3 text-xs text-muted">
        المتوفر من هذا اللون: <bdi>{variant.stock}</bdi> قطعة
      </p>
    </aside>
  );
}
