"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { Vector3, type Group, type MeshStandardMaterial } from "three";
import {
  nearestIndex,
  nearestSpin,
  nearestSpinForIndex,
  slotAngle,
  spinForIndex,
  stepSpin,
} from "@/lib/carousel-math";
import {
  ACTIVE_SCALE,
  FADE_PUSH,
  FADE_SMOOTH,
  FRICTION,
  IDLE_DELAY,
  IDLE_SPIN_SPEED,
  MAX_DELTA,
  OPACITY_CUTOFF,
  SNAP_SMOOTH,
  VELOCITY_EPS,
} from "@/lib/scene-config";
import type { CarouselInput } from "@/lib/use-carousel-input";
import type { ColorVariant, SceneMode } from "@/lib/types";
import { TShirtModel, collectMaterials } from "./TShirtModel";

/** أطوار الحركة الداخلية — منفصلة عن وضع المشهد العام. */
type Phase = "free" | "fling" | "snap" | "idle";

export interface ColorCarouselProps {
  variants: ColorVariant[];
  radius: number;
  mode: SceneMode;
  activeIndex: number;
  initialIndex: number;
  inputRef: RefObject<CarouselInput>;
  reducedMotion: boolean;
  /**
   * الدوران التلقائي عند الخمول. يُطفأ على الشاشات الضيّقة: عرض الرؤية هناك
   * لا يتجاوز ١٫٣ وحدة، والانجراف نصف خانة يزيح القميص ٠٫٩٩ — أي أن المنتج
   * يخرج من الإطار وحده أمام المشتري.
   */
  autoSpin: boolean;
  /** يُفرض المجسّم المولّد بعد فشل تحميل ملف الموديل. */
  forcePlaceholder?: boolean;
  /** يُستدعى عند تبدّل الفهرس الأمامي فقط — مرّات قليلة في الثانية لا 60. */
  onActiveIndexChange: (index: number) => void;
  onSelect: () => void;
  onBack: () => void;
}

export function ColorCarousel({
  variants,
  radius,
  mode,
  activeIndex,
  initialIndex,
  inputRef,
  reducedMotion,
  autoSpin,
  forcePlaceholder = false,
  onActiveIndexChange,
  onSelect,
  onBack,
}: ColorCarouselProps) {
  const n = variants.length;

  const ringRef = useRef<Group>(null);
  const slotRefs = useRef<(Group | null)[]>([]);
  const matsRef = useRef<MeshStandardMaterial[][]>([]);

  /**
   * زاوية الدوران محفوظة في كائن ثابت لا في حالة React: تحديثها 60 مرة في
   * الثانية عبر setState يعني 60 إعادة توفيق للشجرة كلها.
   * وهي **غير مطبَّعة** عمداً، فيبقى التثبيت محلياً وتختفي مشكلة الالتفاف.
   */
  const spinBox = useRef({ value: spinForIndex(initialIndex, n) });
  const velocity = useRef(0);
  const phase = useRef<Phase>("idle");
  const snapTarget = useRef(spinBox.current.value);
  const lastIndex = useRef(initialIndex);

  const dirs = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const th = slotAngle(i, n);
        return { x: Math.sin(th), z: Math.cos(th), angle: th };
      }),
    [n],
  );

  const tmp = useMemo(() => new Vector3(), []);

  // الوضعيات الأساسية تُكتب مرة واحدة بشكل أمري: تمريرها كخصائص JSX يعيد
  // ضبطها مع كل إعادة رسم فيلغي ما حرّكناه في الإطار السابق.
  useEffect(() => {
    slotRefs.current.forEach((slot, i) => {
      if (!slot) return;
      const d = dirs[i];
      slot.position.set(d.x * radius, 0, d.z * radius);
      slot.rotation.set(0, d.angle, 0);
      slot.scale.setScalar(1);
    });
  }, [dirs, radius]);

  // تُجمع بعد التركيب، فالمواد يُنشئها R3F لكل نسخة على حدة
  useEffect(() => {
    matsRef.current = slotRefs.current.map((slot) =>
      slot ? collectMaterials(slot) : [],
    );
  }, [n]);

  useFrame((_state, delta) => {
    const ring = ringRef.current;
    if (!ring) return;

    // بعد تبديل تبويب أو توقّف عند نقطة تصحيح، delta قد يبلغ ثوانٍ
    const d = Math.min(delta, MAX_DELTA);
    const input = inputRef.current;
    const now = performance.now();
    const interactive = mode === "carousel";

    /* ——— الطلبات غير الحركية ——— */
    if (input.backRequest) {
      input.backRequest = false;
      if (mode === "focus" || mode === "focusing") onBack();
    }
    if (input.selectRequest) {
      input.selectRequest = false;
      if (interactive) onSelect();
    }

    if (interactive) {
      /* ——— استهلاك الإدخال ——— */
      if (input.dragDelta !== 0) {
        spinBox.current.value += input.dragDelta;
        input.dragDelta = 0;
        phase.current = "free";
      }
      if (input.gotoIndex !== null) {
        snapTarget.current = nearestSpinForIndex(
          spinBox.current.value,
          input.gotoIndex,
          n,
        );
        input.gotoIndex = null;
        phase.current = "snap";
      }
      if (input.stepRequest !== 0) {
        const dir = input.stepRequest > 0 ? 1 : -1;
        snapTarget.current = stepSpin(
          spinBox.current.value,
          dir,
          n,
          Math.abs(input.stepRequest),
        );
        input.stepRequest = 0;
        phase.current = "snap";
      }
      if (input.flingVel !== null) {
        velocity.current = input.flingVel;
        input.flingVel = null;
        phase.current = "fling";
      }

      /* ——— التكامل الزمني ——— */
      if (input.isPointerDown) {
        velocity.current = 0;
        phase.current = "free";
      } else if (now < input.freeUntilMs) {
        // تمرير عجلة متواصل: نبقيها حرّة حتى يهدأ
        phase.current = "free";
      } else if (phase.current === "fling") {
        // احتكاك أسّي: مستقل عن معدل الإطارات، بعكس vel *= 0.95
        velocity.current *= Math.exp(-FRICTION * d);
        spinBox.current.value += velocity.current * d;
        if (Math.abs(velocity.current) < VELOCITY_EPS) {
          velocity.current = 0;
          snapTarget.current = nearestSpin(spinBox.current.value, n);
          phase.current = "snap";
        }
      } else if (phase.current === "free") {
        snapTarget.current = nearestSpin(spinBox.current.value, n);
        phase.current = "snap";
      } else if (phase.current === "snap") {
        const moving = easing.damp(
          spinBox.current,
          "value",
          snapTarget.current,
          SNAP_SMOOTH,
          d,
        );
        if (!moving) phase.current = "idle";
      } else if (
        autoSpin &&
        !reducedMotion &&
        now - input.lastInteractionAt > IDLE_DELAY * 1000
      ) {
        spinBox.current.value += IDLE_SPIN_SPEED * d;
      }
    } else {
      // الحلقة مجمّدة: نتخلّص من أي إدخال متراكم حتى لا يُنفَّذ عند العودة
      input.dragDelta = 0;
      input.flingVel = null;
      input.stepRequest = 0;
      input.gotoIndex = null;
      velocity.current = 0;
      phase.current = "idle";
      const aligned = nearestSpinForIndex(
        spinBox.current.value,
        activeIndex,
        n,
      );
      if (mode === "focus") {
        // تبديل اللون من الأزرار: الحلقة مخفيّة والكاميرا ملتصقة بالمقدمة،
        // فوضع الخانة الجديدة في المقدمة فوراً يُقرأ تبديلَ لون لا دوراناً
        spinBox.current.value = aligned;
      } else {
        // الدخول والخروج: محاذاة ناعمة. النقر قد يقع والقرص يدور تلقائياً
        // فيكون المختار على بعد نصف خانة من المقدمة — والمحاذاة الفورية هنا
        // تظهر كقفزة لحظة الاختيار.
        easing.damp(spinBox.current, "value", aligned, SNAP_SMOOTH, d);
      }
      lastIndex.current = activeIndex;
    }

    ring.rotation.y = spinBox.current.value;

    const idx = nearestIndex(spinBox.current.value, n);
    if (idx !== lastIndex.current) {
      lastIndex.current = idx;
      onActiveIndexChange(idx);
    }

    /* ——— المظهر: شفافية وتحجيم وإبعاد شعاعي ——— */
    // العودة تُعيد ظهور بقية الألوان أثناء رحلة الكاميرا لا بعدها، وإلا
    // ظهرت دفعة واحدة بعد استقرار المشهد
    const dimOthers = mode === "focusing" || mode === "focus";
    // في وضع التقريب المستقر يكون التبديل فورياً، وإلا رأينا وميضاً بين لونين
    const instant = mode === "focus";

    for (let i = 0; i < n; i++) {
      const slot = slotRefs.current[i];
      if (!slot) continue;

      const isActive = i === activeIndex;
      const wantOpacity = dimOthers ? (isActive ? 1 : 0) : 1;
      const wantScale = interactive && isActive ? ACTIVE_SCALE : 1;
      const push = dimOthers && !isActive ? FADE_PUSH : 0;

      tmp.set(dirs[i].x * (radius + push), 0, dirs[i].z * (radius + push));

      if (instant) {
        slot.position.copy(tmp);
        slot.scale.setScalar(wantScale);
      } else {
        easing.damp3(slot.position, tmp, FADE_SMOOTH, d);
        easing.damp3(slot.scale, wantScale, FADE_SMOOTH, d);
      }

      const mats = matsRef.current[i];
      if (!mats || mats.length === 0) continue;

      let anyVisible = false;
      for (const m of mats) {
        if (instant) m.opacity = wantOpacity;
        else easing.damp(m, "opacity", wantOpacity, FADE_SMOOTH, d);
        if (m.opacity > OPACITY_CUTOFF) anyVisible = true;
      }
      // إطفاء الرسم كلياً بدل رسم شيء شفاف تماماً
      slot.visible = anyVisible;
    }
  });

  return (
    <group ref={ringRef}>
      {variants.map((variant, i) => (
        <group
          key={variant.slug}
          ref={(el) => {
            slotRefs.current[i] = el;
          }}
        >
          {/*
            الظلّ من القميص الأمامي وحده: خريطة الظلال تُعاد رسمها كل إطار،
            وعشرون شبكة فيها كلفة حقيقية مقابل ظلال لا تكاد تُرى على البقية.
          */}
          <TShirtModel
            color={variant.hex}
            image={variant.image}
            castShadow={i === activeIndex}
            source={forcePlaceholder ? "placeholder" : "auto"}
          />
        </group>
      ))}
    </group>
  );
}
