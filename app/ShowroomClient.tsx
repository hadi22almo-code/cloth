"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductGrid } from "@/components/ui/ProductGrid";
import type { Product, SceneMode } from "@/lib/types";

/**
 * ssr:false ممنوع داخل Server Component في Next 15، ولهذا يوجد هذا الغلاف
 * العميل. والكانفس لا يُصيَّر على الخادم أصلاً — لا يوجد WebGL هناك.
 */
const ShowroomCanvas = dynamic(
  () =>
    import("@/components/showroom/ShowroomCanvas").then((m) => m.ShowroomCanvas),
  { ssr: false },
);

/** غياب سياق WebGL لا تلتقطه حدود الخطأ، فنفحصه قبل تركيب الكانفس أصلاً. */
function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
    );
  } catch {
    return false;
  }
}

export function ShowroomClient({ product }: { product: Product }) {
  const params = useSearchParams();
  const [support, setSupport] = useState<"probing" | "ok" | "none">("probing");

  /**
   * يُقرأ الرابط مرة واحدة عند التركيب فقط. الرابط العميق يفتح على وضع التقريب
   * مباشرة بلا حركة طيران — تحريكه أسوأ تجربةً ويسابق تسليم OrbitControls.
   */
  const initial = useMemo<{ index: number; mode: SceneMode }>(() => {
    const slug = params.get("color");
    const index = product.variants.findIndex((v) => v.slug === slug);
    return index >= 0
      ? { index, mode: "focus" }
      : { index: 0, mode: "carousel" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // ?nogl=1 لاختبار مسار البديل يدوياً بلا تعطيل WebGL في المتصفّح
    const forced = new URLSearchParams(window.location.search).get("nogl") === "1";
    setSupport(!forced && detectWebGL() ? "ok" : "none");
  }, []);

  if (support === "probing") {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-sm text-muted">جارٍ التحضير…</p>
      </div>
    );
  }

  if (support === "none") return <ProductGrid product={product} />;

  return <ShowroomCanvas product={product} initial={initial} />;
}
