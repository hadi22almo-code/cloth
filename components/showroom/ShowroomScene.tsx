"use client";

import { Suspense, useState, type RefObject } from "react";
import { ContactShadows } from "@react-three/drei";
import { FOG_COLOR } from "@/lib/scene-config";
import type { CarouselInput } from "@/lib/use-carousel-input";
import type { Product, SceneMode } from "@/lib/types";
import { CameraRig } from "./CameraRig";
import { ColorCarousel } from "./ColorCarousel";
import { SceneErrorBoundary } from "./SceneErrorBoundary";

export interface ShowroomSceneProps {
  product: Product;
  radius: number;
  mode: SceneMode;
  activeIndex: number;
  initialIndex: number;
  lateral: number;
  usableHeight: number;
  inputRef: RefObject<CarouselInput>;
  reducedMotion: boolean;
  autoSpin: boolean;
  onActiveIndexChange: (index: number) => void;
  onSelect: () => void;
  onBack: () => void;
  onArrived: (mode: "focus" | "carousel") => void;
}

export function ShowroomScene({
  product,
  radius,
  mode,
  activeIndex,
  initialIndex,
  lateral,
  usableHeight,
  inputRef,
  reducedMotion,
  autoSpin,
  onActiveIndexChange,
  onSelect,
  onBack,
  onArrived,
}: ShowroomSceneProps) {
  const [modelFailed, setModelFailed] = useState(false);

  return (
    <>
      <color attach="background" args={[FOG_COLOR]} />
      {/* الضباب يبعّد خلفية الحلقة مجاناً فيزيد إحساس العمق */}
      <fog attach="fog" args={[FOG_COLOR, radius + 3, radius * 3.6 + 3]} />

      {/*
        إضاءة صريحة بدل <Environment preset>: الأخير يحمّل خريطة HDRI من شبكة
        توزيع خارجية، فيضيف تبعية شبكة وميغابايتات ويكسر العمل دون إنترنت.
      */}
      <ambientLight intensity={0.62} />
      <directionalLight
        position={[3.5, 6, 5]}
        intensity={1.7}
        castShadow
        // ١٠٢٤ تكفي لظلّ ناعم على أسطح مصمتة، وتوفّر ربع كلفة ٢٠٤٨
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={25}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        // بدونهما يظهر تشويش ظلال ذاتي على الأسطح المنحنية للقميص
        shadow-bias={-0.0008}
        shadow-normalBias={0.09}
      />
      <directionalLight position={[-5, 2.5, 3]} intensity={0.5} />
      {/* ضوء حافة من الخلف: بدونه يذوب القميص الأسود في الخلفية الداكنة */}
      <directionalLight
        position={[0, 4, -7]}
        intensity={1.5}
        color="#93b8ff"
      />

      <CameraRig
        mode={mode}
        radius={radius}
        lateral={lateral}
        usableHeight={usableHeight}
        onArrived={onArrived}
      />

      {/*
        فشل تحميل الموديل يجب ألا يُسقط المشهد: نلتقطه هنا ثم نعيد الرسم
        بالمجسّم المولّد بالكود. المفتاح يعيد تهيئة الحدود بعد التبديل.
      */}
      <SceneErrorBoundary
        key={modelFailed ? "placeholder" : "primary"}
        onError={() => setModelFailed(true)}
      >
        <Suspense fallback={null}>
          <ColorCarousel
            variants={product.variants}
            radius={radius}
            mode={mode}
            activeIndex={activeIndex}
            initialIndex={initialIndex}
            inputRef={inputRef}
            reducedMotion={reducedMotion}
            autoSpin={autoSpin}
            forcePlaceholder={modelFailed}
            onActiveIndexChange={onActiveIndexChange}
            onSelect={onSelect}
            onBack={onBack}
          />
        </Suspense>
      </SceneErrorBoundary>

      {/*
        ظلّ التماس يُعاد رسمه كل إطار من زاوية إضافية. خفض الدقّة والمدى يقلّص
        كلفته كثيراً دون فرق مرئي، لأنه ناعم ومعتم جزئياً أصلاً.
      */}
      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={0.45}
        scale={radius * 2.6}
        blur={2.8}
        far={2.2}
        resolution={256}
      />
    </>
  );
}
