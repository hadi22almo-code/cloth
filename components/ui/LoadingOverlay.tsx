"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

/**
 * useProgress يعكس فقط ما يمرّ بمدير التحميل في three. حين يكون المجسّم مولّداً
 * بالكود لا يُحمَّل شيء إطلاقاً، فتبقى progress على الصفر — وشرط ساذج مثل
 * `progress < 100` يترك شاشة تحميل عالقة إلى الأبد.
 *
 * لذلك نعتمد على `active`، ونشترط أن يكون تحميل قد بدأ فعلاً مرة واحدة.
 */
export function LoadingOverlay() {
  const { active, progress } = useProgress();
  const [everStarted, setEverStarted] = useState(false);

  useEffect(() => {
    if (active) setEverStarted(true);
  }, [active]);

  const show = everStarted && active;
  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-background/70 backdrop-blur-sm"
    >
      <div className="w-56 text-center">
        <p className="mb-3 text-sm text-muted">جارٍ تحميل المجسّم…</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-200"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
