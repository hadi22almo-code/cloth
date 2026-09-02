"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  CAM_FAR,
  CAM_FOV,
  CAM_NEAR,
  PANEL_OFFSET_X,
  ringRadius,
} from "@/lib/scene-config";
import { useCarouselInput } from "@/lib/use-carousel-input";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { Product, SceneMode } from "@/lib/types";
import { CartButton } from "@/components/cart/CartButton";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useCart } from "@/lib/store/cart";
import { BackButton } from "@/components/ui/BackButton";
import { CarouselHint } from "@/components/ui/CarouselHint";
import { ColorSwatches } from "@/components/ui/ColorSwatches";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { ProductPanel } from "@/components/ui/ProductPanel";
import { ShowroomScene } from "./ShowroomScene";
import { preloadTee } from "./TShirtModel";

export interface ShowroomCanvasProps {
  product: Product;
  initial: { index: number; mode: SceneMode };
}

/**
 * مالك حالة React الوحيد في التجربة. كل ما يتغيّر 60 مرة في الثانية يعيش في
 * refs داخل ColorCarousel وCameraRig؛ ما هنا يتغيّر مرّات معدودة في الثانية.
 */
export function ShowroomCanvas({ product, initial }: ShowroomCanvasProps) {
  const variants = product.variants;
  const n = variants.length;
  const radius = ringRadius(n);

  const [mode, setMode] = useState<SceneMode>(initial.mode);
  const [activeIndex, setActiveIndex] = useState(initial.index);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [wideScreen, setWideScreen] = useState(false);
  /*
   * سقف كثافة البكسل. يبدأ ١٫٧٥ لا ٢: على هاتف بكثافة ٣ يعني ٢ أربعة أضعاف
   * البكسلات لمكسب بصري لا يكاد يُرى في مشهد بأسطح مصمتة. ويهبط تلقائياً حين
   * يتعثّر معدّل الإطارات، فتبقى الحركة سلسة على الأجهزة الضعيفة.
   */
  const [dpr, setDpr] = useState(1.75);
  const [cartOpen, setCartOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const addToCart = useCart((s) => s.add);

  const surfaceRef = useRef<HTMLDivElement>(null);

  // ref لا حالة: تغييره لا يجب أن يعيد تركيب مستمعات الأحداث
  const enabledRef = useRef(mode === "carousel");
  useEffect(() => {
    enabledRef.current = mode === "carousel";
  }, [mode]);

  // السلة تعلّق إدخال القرص كلياً حتى لا يبتلع Escape الخاص بها
  const suspendedRef = useRef(false);
  useEffect(() => {
    suspendedRef.current = cartOpen;
  }, [cartOpen]);

  const inputRef = useCarouselInput(surfaceRef, {
    n,
    enabledRef,
    suspendedRef,
  });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    preloadTee();
  }, []);

  // على الشاشات الضيّقة تجلس اللوحة أسفل الشاشة، فلا داعي لإزاحة المشهد جانباً
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    setWideScreen(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setWideScreen(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const focused = mode === "focus" || mode === "focusing";

  /**
   * الكتابة في الرابط عبر history.replaceState لا router.replace: الأخير يطلق
   * دورة خادم كاملة وإعادة رسم للشجرة عند كل نقرة لون.
   */
  useEffect(() => {
    const url = new URL(window.location.href);
    if (focused) url.searchParams.set("color", variants[activeIndex].slug);
    else url.searchParams.delete("color");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [focused, activeIndex, variants]);

  const handleSelect = useCallback(() => {
    setMode((m) => (m === "carousel" ? "focusing" : m));
  }, []);

  const handleBack = useCallback(() => {
    setMode((m) => (m === "focus" || m === "focusing" ? "returning" : m));
  }, []);

  const handleArrived = useCallback((arrivedAt: "focus" | "carousel") => {
    setMode((m) => {
      if (arrivedAt === "focus") return m === "focusing" ? "focus" : m;
      return m === "returning" ? "carousel" : m;
    });
  }, []);

  /**
   * أزرار الألوان هي المسار الوحيد القابل للتركيز في وضع الحلقة، فلا بد أن
   * تفتح المنتج بنفسها. كانت تدوّر الحلقة فقط، فبقي مستخدم لوحة المفاتيح
   * عاجزاً عن بلوغ المقاسات وزر الشراء إطلاقاً.
   */
  const pickColor = useCallback(
    (index: number) => {
      if (mode === "carousel") {
        setActiveIndex(index);
        setMode("focusing");
        setHasInteracted(true);
      } else if (mode === "focus") {
        setActiveIndex(index);
      }
    },
    [mode],
  );

  const activeVariant = variants[activeIndex];

  const handleAddToCart = useCallback(() => {
    if (!selectedSize) return;
    addToCart({
      productSlug: product.slug,
      variantSlug: activeVariant.slug,
      sizeLabel: selectedSize,
      nameAr: product.nameAr,
      colorNameAr: activeVariant.nameAr,
      colorHex: activeVariant.hex,
      unitPrice: product.price,
      currency: product.currency,
    });
    setJustAdded(true);
  }, [addToCart, product, activeVariant, selectedSize]);

  // تختفي رسالة التأكيد وحدها، وتُلغى عند تغيير اللون أو المقاس
  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 2500);
    return () => clearTimeout(t);
  }, [justAdded]);

  useEffect(() => {
    setJustAdded(false);
  }, [activeIndex, selectedSize]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        ref={surfaceRef}
        onPointerDown={() => setHasInteracted(true)}
        role="application"
        tabIndex={mode === "carousel" ? 0 : -1}
        aria-roledescription="قرص ألوان ثلاثي الأبعاد"
        aria-label="اسحب لتدوير قرص الألوان، ثم انقر أو اضغط Enter لاختيار اللون الأمامي"
        // touch-none إلزامي وإلا مرّر السحب الصفحة على الهاتف بدل تدوير القرص
        className="absolute inset-0 touch-none select-none"
      >
        <Canvas
          shadows
          dpr={dpr}
          gl={{
            // التنعيم مكلف على الهاتف، وكثافة البكسل العالية تُغني عنه
            antialias: wideScreen,
            powerPreference: "high-performance",
          }}
          camera={{
            fov: CAM_FOV,
            near: CAM_NEAR,
            far: CAM_FAR,
            position: [0, 1.05, radius + 3.1],
          }}
        >
          {/*
            يراقب معدّل الإطارات ويخفض الجودة عند التعثّر بدل أن يتقطّع المشهد.
            flipflops يمنع التذبذب بين مستويين إن كان الجهاز على الحدّ.
          */}
          <PerformanceMonitor
            flipflops={3}
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(1.75)}
          />
          <AdaptiveDpr pixelated={false} />

          <ShowroomScene
            product={product}
            radius={radius}
            mode={mode}
            activeIndex={activeIndex}
            initialIndex={initial.index}
            lateral={wideScreen && focused ? PANEL_OFFSET_X : 0}
            /*
             * على الشاشة الضيّقة تحتلّ لوحة المنتج أسفل الإطار، فنُبقي للقميص
             * ٥٥٪ العليا ونرفعه إليها بدل أن يختفي خلفها.
             */
            usableHeight={focused && !wideScreen ? 0.55 : 1}
            inputRef={inputRef}
            reducedMotion={reducedMotion}
            autoSpin={wideScreen}
            onActiveIndexChange={setActiveIndex}
            onSelect={handleSelect}
            onBack={handleBack}
            onArrived={handleArrived}
          />
        </Canvas>
      </div>

      {/* الطبقة العلوية لا تلتقط المؤشر إلا عند عناصر التحكّم نفسها */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col p-4 sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold">{product.nameAr}</p>
            <p className="text-xs text-muted">قرص الألوان</p>
          </div>
          <div className="flex items-center gap-2">
            <BackButton visible={focused} onClick={handleBack} />
            <CartButton onClick={() => setCartOpen(true)} />
          </div>
        </header>

        <div className="flex-1" />

        <footer className="flex flex-col items-center gap-3">
          {/*
            الشارة على زر السلة قطرها ٢٤ بكسل في زاوية الشاشة — تمرّ دون أن
            تُرى. هذا التأكيد يظهر في مسار نظر المشتري ويمنحه الخطوة التالية.
          */}
          {justAdded && (
            <div
              role="status"
              className="pointer-events-auto flex items-center gap-3 rounded-full border border-accent/50 bg-surface/95 px-4 py-2 shadow-lg backdrop-blur"
            >
              <span className="text-sm font-semibold text-accent">
                أُضيف إلى السلة ✓
              </span>
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="min-h-9 rounded-full border border-border px-3 text-xs hover:border-muted focus-visible:outline-2 focus-visible:outline-accent"
              >
                عرض السلة
              </button>
            </div>
          )}

          <CarouselHint visible={mode === "carousel" && !hasInteracted} />
          <div className="pointer-events-auto">
            <ColorSwatches
              variants={variants}
              activeIndex={activeIndex}
              onPick={pickColor}
            />
          </div>
          {/* إعلان للقارئات الصوتية: الكانفس غير مقروء لها */}
          {/*
            الكانفس غير موجود في شجرة الإتاحة إطلاقاً، فهذه المنطقة هي كل ما
            يسمعه قارئ الشاشة. تعلن اللون والسعر والتوفّر لا اللون وحده.
          */}
          <p aria-live="polite" className="sr-only">
            {focused
              ? `${product.nameAr}، اللون ${activeVariant.nameAr}، السعر ${product.price} ${product.currency}، المتوفر ${activeVariant.stock} قطعة`
              : `اللون الحالي: ${activeVariant.nameAr}`}
          </p>
        </footer>
      </div>

      {/*
        overflow-y-auto إلزامي: الجذر fixed…overflow-hidden، فمع تكبير الخط
        ٢٠٠٪ كانت اللوحة تخرج من أعلى الشاشة ومعها السعر بلا أي سبيل للتمرير.
      */}
      <div className="pointer-events-none absolute inset-y-0 start-0 z-10 flex max-h-dvh overflow-y-auto p-4 pb-36 sm:p-6 sm:pb-6">
        <ProductPanel
          product={product}
          variant={activeVariant}
          visible={focused}
          selectedSize={selectedSize}
          onSelectSize={setSelectedSize}
          onAddToCart={handleAddToCart}
          compact={!wideScreen}
        />
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <LoadingOverlay />
    </div>
  );
}
