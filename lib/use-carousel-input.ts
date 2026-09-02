"use client";

import { useEffect, useRef, type RefObject } from "react";
import { pxToRadians } from "./carousel-math";
import {
  DRAG_PX_PER_SLOT,
  MAX_VELOCITY,
  WHEEL_GAIN,
  WHEEL_SETTLE_MS,
  KEY_SPATIAL_DIR,
} from "./scene-config";

/**
 * صندوق بريد بين طبقة الأحداث DOM وحلقة الرسم.
 * كل الحقول تُستهلك داخل useFrame ثم تُصفَّر — لا حالة React هنا إطلاقاً،
 * وإلا صارت 60 إعادة رسم في الثانية.
 */
export interface CarouselInput {
  /** راديان متراكمة منذ آخر إطار (سحب أو عجلة). */
  dragDelta: number;
  /** سرعة القذف عند الإفلات (راديان/ثانية)، أو null. */
  flingVel: number | null;
  /** عدد الخانات المطلوب الانتقال بها، بإشارة. */
  stepRequest: number;
  /** انتقال مباشر إلى فهرس محدّد (Home / End / نقر على لون). */
  gotoIndex: number | null;
  /** طلب اختيار اللون الأمامي (نقرة أو Enter). */
  selectRequest: boolean;
  /** طلب الرجوع من وضع التقريب (Escape). */
  backRequest: boolean;
  isPointerDown: boolean;
  /** حتى هذه اللحظة تبقى الحلقة حرّة بلا تثبيت (تمرير عجلة متواصل). */
  freeUntilMs: number;
  /** آخر تفاعل، لبدء الدوران التلقائي بعد فترة خمول. */
  lastInteractionAt: number;
}

function createInput(): CarouselInput {
  return {
    dragDelta: 0,
    flingVel: null,
    stepRequest: 0,
    gotoIndex: null,
    selectRequest: false,
    backRequest: false,
    isPointerDown: false,
    freeUntilMs: 0,
    lastInteractionAt: 0,
  };
}

/** أقصى إزاحة بالبكسل وأقصى مدة تُعتبر بعدها الحركة نقرة لا سحباً. */
const CLICK_MAX_PX = 6;
const CLICK_MAX_MS = 400;

interface Options {
  /** عدد الألوان — يحدّد حجم الخانة. */
  n: number;
  /** هل الحلقة تقبل الإدخال الآن؟ ref حتى لا نعيد تركيب المستمعات مع كل تغيّر وضع. */
  enabledRef: RefObject<boolean>;
  /**
   * تعليق كامل: لا مؤشر ولا عجلة ولا مفاتيح — ولا حتى Escape.
   * تستخدمه الطبقات المشروطة فوق المشهد (السلة) حتى لا يبتلع القرص مفاتيحها.
   */
  suspendedRef?: RefObject<boolean>;
}

/**
 * يربط أحداث المؤشر والعجلة ولوحة المفاتيح بحاوية الكانفس.
 *
 * الأحداث على الحاوية DOM وليست على الشبكات: أحداث R3F تمرّ بالـraycaster،
 * فينقطع السحب لحظة خروج المؤشر عن ظلّ القميص — وهو بالضبط ما يحدث عند القذف.
 */
export function useCarouselInput(
  hostRef: RefObject<HTMLElement | null>,
  { n, enabledRef, suspendedRef }: Options,
): RefObject<CarouselInput> {
  const inputRef = useRef<CarouselInput>(createInput());

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const input = inputRef.current;
    const radPerPx = pxToRadians(1, n, DRAG_PX_PER_SLOT);

    let pointerId: number | null = null;
    let lastX = 0;
    let startX = 0;
    let startY = 0;
    let startedAt = 0;
    let travelled = 0;
    /** آخر ثلاث عيّنات للسرعة: الاعتماد على آخر إزاحة وحدها يقتل القذف. */
    let samples: { dx: number; dt: number }[] = [];
    let lastMoveAt = 0;

    const touch = () => {
      input.lastInteractionAt = performance.now();
    };

    const suspended = () => suspendedRef?.current === true;

    const onPointerDown = (e: PointerEvent) => {
      if (suspended() || !enabledRef.current) return;
      if (pointerId !== null) return; // إصبع ثانٍ لا يخطف السحب
      if (e.button !== undefined && e.button !== 0) return;
      pointerId = e.pointerId;
      lastX = startX = e.clientX;
      startY = e.clientY;
      startedAt = lastMoveAt = performance.now();
      travelled = 0;
      samples = [];
      input.isPointerDown = true;
      input.flingVel = null;
      touch();
      // بدون هذا ينقطع تتبّع الحركة فور خروج المؤشر من النافذة أو تجاوزه العنصر
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      travelled = Math.max(
        travelled,
        Math.hypot(e.clientX - startX, e.clientY - startY),
      );
      const dt = Math.max((now - lastMoveAt) / 1000, 1e-4);
      lastMoveAt = now;
      // السحب يميناً يحرّك القمصان يميناً — لا يُعكس في RTL أبداً
      input.dragDelta += dx * radPerPx;
      samples.push({ dx, dt });
      if (samples.length > 3) samples.shift();
      touch();
    };

    const endDrag = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      pointerId = null;
      input.isPointerDown = false;
      const now = performance.now();

      const isClick =
        travelled < CLICK_MAX_PX && now - startedAt < CLICK_MAX_MS;
      if (isClick) {
        if (enabledRef.current) input.selectRequest = true;
      } else {
        const sumDx = samples.reduce((s, v) => s + v.dx, 0);
        const sumDt = samples.reduce((s, v) => s + v.dt, 0);
        if (sumDt > 0) {
          const v = (sumDx * radPerPx) / sumDt;
          input.flingVel = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v));
        }
      }
      samples = [];
      touch();
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };

    /**
     * React 19 يسجّل onWheel كمستمع passive، فـpreventDefault داخل JSX يفشل
     * صامتاً وتنزل الصفحة. لذلك نسجّله يدوياً.
     */
    const onWheel = (e: WheelEvent) => {
      if (suspended() || !enabledRef.current) return;
      e.preventDefault();
      // deltaMode: 0 بكسل، 1 أسطر (فايرفوكس)، 2 صفحات
      const unit =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      // التمرير الأفقي على التراكباد يأتي في deltaX
      const raw = (e.deltaX !== 0 ? e.deltaX : e.deltaY) * unit;
      // العجلة تناظرية مثل السحب: لمسة تراكباد واحدة تطلق عشرات الأحداث،
      // فـ"خانة لكل حدث" تقفز عشر خانات دفعة واحدة.
      input.dragDelta += raw * radPerPx * WHEEL_GAIN;
      input.freeUntilMs = performance.now() + WHEEL_SETTLE_MS;
      touch();
    };

    /** لا نخطف المفاتيح من حقول الإدخال ولا من زر مركَّز عليه. */
    const isTypingTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el || !el.tagName) return false;
      if (el.isContentEditable) return true;
      return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (suspended() || isTypingTarget(e.target)) return;
      // Escape يعمل في وضع التقريب حيث الحلقة معطّلة
      if (e.key === "Escape") {
        input.backRequest = true;
        touch();
        return;
      }
      if (!enabledRef.current) return;

      switch (e.key) {
        case "ArrowRight":
          input.stepRequest += KEY_SPATIAL_DIR;
          break;
        case "ArrowLeft":
          input.stepRequest -= KEY_SPATIAL_DIR;
          break;
        case "Home":
          input.gotoIndex = 0;
          break;
        case "End":
          input.gotoIndex = n - 1;
          break;
        case "Enter":
        case " ":
          // زر مركَّز عليه يستهلك المسافة والإدخال بنفسه
          if ((e.target as HTMLElement | null)?.tagName === "BUTTON") return;
          input.selectRequest = true;
          break;
        default:
          return;
      }
      e.preventDefault();
      touch();
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("lostpointercapture", endDrag);
    el.addEventListener("wheel", onWheel, { passive: false });
    // المفاتيح على النافذة: لا تعتمد على تركيز عنصر بعينه
    window.addEventListener("keydown", onKeyDown);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("lostpointercapture", endDrag);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [hostRef, n, enabledRef, suspendedRef]);

  return inputRef;
}
