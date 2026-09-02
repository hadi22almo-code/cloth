"use client";

import type { ColorVariant } from "@/lib/types";

/**
 * الكانفس غير مرئي لقارئات الشاشة، فهذه الأزرار هي مسار الوصول الوحيد
 * للألوان: عناصر <button> حقيقية بترتيب DOM، فيتبعها Tab حسب ترتيب القراءة
 * العربي بلا أي تدخّل منّا.
 *
 * ملاحظة RTL: نستخدم flex-wrap مع gap، لا overflow-x-auto — قيمة scrollLeft
 * في الاتجاه من اليمين لليسار غير متّسقة بين المحرّكات.
 */
export function ColorSwatches({
  variants,
  activeIndex,
  onPick,
}: {
  variants: ColorVariant[];
  activeIndex: number;
  onPick: (index: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="ألوان التيشيرت"
      /*
       * شبكة ٥×٢ على الهاتف بدل flex-wrap: عشرة أزرار بعرض ٤٤ لا تتّسع في صفّ
       * واحد على ٣٥٨ بكسل، فكانت تلتفّ ٨ ثم ٢ التفافاً مشوّهاً.
       * ولا نستخدم تمريراً أفقياً: قيمة scrollLeft غير متّسقة بين المحرّكات في RTL.
       */
      className="mx-auto grid max-w-fit grid-cols-5 place-items-center gap-2 sm:flex sm:flex-wrap sm:gap-2.5"
    >
      {variants.map((variant, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={variant.slug}
            type="button"
            onClick={() => onPick(i)}
            aria-pressed={active}
            aria-label={variant.nameAr}
            title={variant.nameAr}
            className={[
              // ٤٤ بكسل: الحدّ الأدنى لمساحة لمس مريحة
              "size-11 rounded-full border transition",
              "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent",
              // حلقة داخلية فاتحة: بدونها يذوب اللون الأسود (‏1.04:1) في الخلفية
              "ring-1 ring-inset ring-white/30",
              active
                ? "border-accent ring-2 ring-accent/60 scale-110"
                : "border-border hover:border-muted",
            ].join(" ")}
            style={{ backgroundColor: variant.hex }}
          >
            <span className="sr-only">{variant.nameAr}</span>
          </button>
        );
      })}
    </div>
  );
}
