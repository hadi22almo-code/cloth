"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { Price } from "./Price";

/**
 * البديل حين لا يدعم المتصفّح WebGL.
 *
 * لا يلتقطه ErrorBoundary ولا Suspense: غياب سياق WebGL يظهر عند تركيب
 * الكانفس بطريقة لا تُستأنف. لذلك نفحص القدرة **قبل** تركيبه أصلاً، ونعرض
 * هذه الشبكة بدل شاشة سوداء.
 */
export function ProductGrid({ product }: { product: Product }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const variant = product.variants[activeIndex];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">{product.nameAr}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        متصفّحك لا يدعم العرض ثلاثي الأبعاد، فهذه نسخة مبسّطة من المعرض.
      </p>

      <p className="mt-4 text-2xl font-bold text-accent">
        <Price value={product.price} currency={product.currency} />
      </p>

      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {product.variants.map((v, i) => (
          <li key={v.slug}>
            <button
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-pressed={i === activeIndex}
              className={[
                "w-full rounded-xl border p-3 text-start transition",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                i === activeIndex
                  ? "border-accent bg-surface"
                  : "border-border hover:border-muted",
              ].join(" ")}
            >
              {v.image ? (
                <Image
                  src={v.image}
                  alt={v.nameAr}
                  width={200}
                  height={200}
                  className="block h-24 w-full rounded-lg border border-border object-cover"
                />
              ) : (
                <span
                  className="block h-24 w-full rounded-lg border border-border"
                  style={{ backgroundColor: v.hex }}
                  aria-hidden
                />
              )}
              <span className="mt-2 block text-sm">{v.nameAr}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-muted">
        اللون المختار: <span className="text-foreground">{variant.nameAr}</span>
        {" — "}
        المتوفر <bdi>{variant.stock}</bdi> قطعة
      </p>
    </main>
  );
}
