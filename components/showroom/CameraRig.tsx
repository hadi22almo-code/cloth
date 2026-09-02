"use client";

import { useEffect, useMemo, useRef, type ComponentRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { Vector3 } from "three";
import {
  ARRIVE_TIMEOUT_MS,
  MAX_DELTA,
  ORBIT_MAX_DISTANCE_FACTOR,
  ORBIT_MAX_POLAR,
  ORBIT_MIN_DISTANCE_FACTOR,
  ORBIT_MIN_POLAR,
  RING_CAM_TARGET,
  focusDistance,
  focusLift,
  ringDistance,
  SMOOTH_FOCUS,
  SMOOTH_RETURN,
  focusCameraPos,
  focusCameraTarget,
  ringCameraPos,
} from "@/lib/scene-config";
import type { SceneMode } from "@/lib/types";

type Controls = ComponentRef<typeof OrbitControls>;

export interface CameraRigProps {
  mode: SceneMode;
  radius: number;
  /** إزاحة جانبية تُبعد القميص عن لوحة المنتج (الشاشات العريضة). */
  lateral: number;
  /**
   * نصيب الارتفاع غير المحجوب بلوحة المنتج. على الهاتف تجلس اللوحة أسفل
   * الشاشة فيبقى للقميص أعلاها فقط.
   */
  usableHeight: number;
  onArrived: (mode: "focus" | "carousel") => void;
}

/**
 * قائد الكاميرا. القاعدة الحاكمة: **جهة واحدة تقود الكاميرا في كل لحظة**.
 * استدعاء lookAt اليدوي و controls.update() في الإطار نفسه يعطي ارتجافاً
 * بمعدل الإطارات، لأن كليهما يكتب اتجاه الكاميرا.
 */
export function CameraRig({
  mode,
  radius,
  lateral,
  usableHeight,
  onArrived,
}: CameraRigProps) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controlsRef = useRef<Controls>(null);

  // التأطير يُحسب من نسبة الشاشة الفعلية: مسافة ثابتة تقصّ الكمّين على الهاتف
  const aspect = size.height > 0 ? size.width / size.height : 1;

  const poses = useMemo(() => {
    const distance = focusDistance(aspect, usableHeight, lateral);
    const lift = focusLift(distance, usableHeight);
    return {
      ring: ringCameraPos(radius, ringDistance(radius, aspect)),
      focusPos: focusCameraPos(radius, lateral, distance, lift),
      focusTarget: focusCameraTarget(radius, lateral, lift),
    };
  }, [radius, lateral, aspect, usableHeight]);

  /** الهدف الذي تنظر إليه الكاميرا؛ يُخمَّد مع الموضع بنفس زمن النعومة. */
  const lookTarget = useRef(new Vector3().copy(RING_CAM_TARGET));
  const initialized = useRef(false);
  const prevMode = useRef<SceneMode>(mode);
  const transitionStart = useRef(0);
  const settledFrames = useRef(0);

  useEffect(() => {
    const controls = controlsRef.current;

    // وضعية البداية تُكتب فوراً: الرابط العميق يفتح على وضع التقريب مباشرة
    // بلا حركة طيران، لأنها تسابق تسليم السيطرة إلى OrbitControls.
    if (!initialized.current) {
      initialized.current = true;
      if (mode === "focus") {
        camera.position.copy(poses.focusPos);
        lookTarget.current.copy(poses.focusTarget);
      } else {
        camera.position.copy(poses.ring);
        lookTarget.current.copy(RING_CAM_TARGET);
      }
      camera.lookAt(lookTarget.current);
    }

    if (mode === "focusing" || mode === "returning") {
      transitionStart.current = performance.now();
      settledFrames.current = 0;
    }

    if (controls) {
      if (mode === "focus") {
        controls.target.copy(poses.focusTarget);
        const dist = camera.position.distanceTo(controls.target);
        controls.minDistance = dist * ORBIT_MIN_DISTANCE_FACTOR;
        controls.maxDistance = dist * ORBIT_MAX_DISTANCE_FACTOR;
        // لازمة قبل التفعيل: OrbitControls يشتقّ إحداثياته الكروية من موضع
        // الكاميرا لحظة update، وبدونها تقفز عند أول حركة ماوس.
        controls.update();
      } else if (prevMode.current === "focus") {
        // نبذر المخمِّد من حيث ترك المستخدم التدوير، وإلا قفزت الكاميرا
        lookTarget.current.copy(controls.target);
      }
    }

    prevMode.current = mode;
  }, [mode, camera, poses]);

  useFrame((_state, delta) => {
    // في وضع التقريب المستقر، OrbitControls هو القائد — لا نلمس الكاميرا
    if (mode === "focus") return;

    const d = Math.min(delta, MAX_DELTA);
    const toFocus = mode === "focusing";
    const wantPos = toFocus ? poses.focusPos : poses.ring;
    const wantTarget = toFocus ? poses.focusTarget : RING_CAM_TARGET;
    const smooth = toFocus ? SMOOTH_FOCUS : SMOOTH_RETURN;

    // نابض حرج بلا تجاوز: التجاوز على الكاميرا يُقرأ كارتداد مُدوّخ.
    // زمن النعومة نفسه للموضع والهدف، وإلا انحنى المسار.
    const movingPos = easing.damp3(camera.position, wantPos, smooth, d);
    const movingTarget = easing.damp3(lookTarget.current, wantTarget, smooth, d);
    camera.lookAt(lookTarget.current);

    if (mode !== "focusing" && mode !== "returning") return;

    if (!movingPos && !movingTarget) {
      // إطاران متتاليان: إطار واحد قد يعطي إشارة كاذبة عند تغيير حجم النافذة
      settledFrames.current += 1;
      if (settledFrames.current >= 2) {
        onArrived(toFocus ? "focus" : "carousel");
        return;
      }
    } else {
      settledFrames.current = 0;
    }

    // شبكة أمان: لا نعلق في حالة انتقال لو تعثّر المخمِّد
    if (performance.now() - transitionStart.current > ARRIVE_TIMEOUT_MS) {
      camera.position.copy(wantPos);
      lookTarget.current.copy(wantTarget);
      camera.lookAt(lookTarget.current);
      onArrived(toFocus ? "focus" : "carousel");
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={mode === "focus"}
      enablePan={false}
      enableZoom
      enableDamping
      dampingFactor={0.08}
      minPolarAngle={ORBIT_MIN_POLAR}
      maxPolarAngle={ORBIT_MAX_POLAR}
    />
  );
}
