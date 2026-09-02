import { describe, expect, it } from "vitest";
import {
  TAU,
  frontness,
  mod,
  nearestIndex,
  nearestSpin,
  normalizeAngle,
  pxToRadians,
  shortestDelta,
  signedAngle,
  slotAngle,
  slotStep,
  spinForIndex,
  stepSpin,
  nearestSpinForIndex,
} from "./carousel-math";

describe("mod", () => {
  it("يعيد قيمة موجبة دائماً", () => {
    expect(mod(-1, 8)).toBe(7);
    expect(mod(-9, 8)).toBe(7);
    expect(mod(8, 8)).toBe(0);
    expect(mod(3, 8)).toBe(3);
  });

  it("لا يعيد -0 أبداً", () => {
    expect(Object.is(mod(-0, 8), 0)).toBe(true);
    expect(Object.is(mod(-8, 8), 0)).toBe(true);
  });

  it("يحمي من القسمة على صفر ومن NaN", () => {
    expect(mod(5, 0)).toBe(0);
    expect(mod(Number.NaN, 8)).toBe(0);
  });
});

describe("slotStep / slotAngle", () => {
  it("يقسّم الدائرة بالتساوي", () => {
    expect(slotStep(8)).toBeCloseTo(TAU / 8, 12);
    expect(slotAngle(2, 8)).toBeCloseTo(TAU / 4, 12);
  });

  it("يلتفّ الفهرس", () => {
    expect(slotAngle(8, 8)).toBeCloseTo(0, 12);
    expect(slotAngle(-1, 8)).toBeCloseTo(slotAngle(7, 8), 12);
  });

  it("n = 1 يعطي خطوة دورة كاملة، وn = 0 لا يكسر", () => {
    expect(slotStep(1)).toBeCloseTo(TAU, 12);
    expect(slotStep(0)).toBe(TAU);
    expect(Number.isFinite(slotAngle(3, 0))).toBe(true);
  });
});

describe("normalizeAngle", () => {
  it("يلفّ إلى المجال [0, TAU)", () => {
    expect(normalizeAngle(TAU)).toBe(0);
    expect(normalizeAngle(-TAU)).toBe(0);
    expect(normalizeAngle(3 * TAU + 1)).toBeCloseTo(1, 10);
    expect(normalizeAngle(-0.0001)).toBeCloseTo(TAU - 0.0001, 10);
  });

  it("النتيجة داخل المجال حتى لقيم ضخمة أو دقيقة جداً", () => {
    for (const a of [1e9, -1e9, 1e-15, -1e-15]) {
      const r = normalizeAngle(a);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(TAU);
    }
  });
});

describe("signedAngle", () => {
  it("يعتمد اصطلاح +π عند الطرفين", () => {
    expect(signedAngle(Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(signedAngle(-Math.PI)).toBeCloseTo(Math.PI, 12);
  });

  it("يلفّ إلى المجال (-π, π]", () => {
    expect(signedAngle(TAU - 0.1)).toBeCloseTo(-0.1, 10);
    expect(signedAngle(0.1)).toBeCloseTo(0.1, 12);
  });
});

describe("shortestDelta", () => {
  it("يختار الطريق القصير عبر 0/2π", () => {
    expect(shortestDelta(0.1, TAU - 0.1)).toBeCloseTo(-0.2, 10);
    expect(shortestDelta(TAU - 0.1, 0.1)).toBeCloseTo(0.2, 10);
  });

  it("النقطة المقابلة تماماً تعطي +π", () => {
    expect(shortestDelta(0, Math.PI)).toBeCloseTo(Math.PI, 12);
  });

  it("قيمة الفرق ≤ π ويصل فعلاً للهدف — لألف زوج عشوائي", () => {
    for (let k = 0; k < 1000; k++) {
      const a = (Math.random() - 0.5) * 40;
      const b = (Math.random() - 0.5) * 40;
      const d = shortestDelta(a, b);
      expect(Math.abs(d)).toBeLessThanOrEqual(Math.PI + 1e-9);
      expect(normalizeAngle(a + d)).toBeCloseTo(normalizeAngle(b), 8);
    }
  });
});

describe("spinForIndex مع nearestIndex", () => {
  it("خاصية الذهاب والعودة لكل n من 1 إلى 16", () => {
    for (let n = 1; n <= 16; n++) {
      for (let i = 0; i < n; i++) {
        expect(nearestIndex(spinForIndex(i, n), n)).toBe(i);
      }
    }
  });

  it("يعمل مع spin سالب صغير ومع دورات متراكمة", () => {
    expect(nearestIndex(-0.01, 8)).toBe(0);
    expect(nearestIndex(spinForIndex(3, 8) - 5 * TAU, 8)).toBe(3);
  });

  it("n = 1 يعطي الفهرس 0 مهما كان spin، وn = 0 لا يعطي NaN", () => {
    expect(nearestIndex(12.34, 1)).toBe(0);
    expect(nearestIndex(-99, 1)).toBe(0);
    expect(nearestIndex(1.5, 0)).toBe(0);
  });
});

describe("nearestSpin", () => {
  it("لا يتحرك أكثر من نصف خانة", () => {
    for (let k = 0; k < 500; k++) {
      const s = (Math.random() - 0.5) * 200;
      expect(Math.abs(nearestSpin(s, 8) - s)).toBeLessThanOrEqual(
        slotStep(8) / 2 + 1e-9,
      );
    }
  });

  it("محلي: لا يعود إلى الصفر بعد ألف دورة", () => {
    const s = 1000 * TAU + 0.1;
    expect(Math.abs(nearestSpin(s, 8) - s)).toBeLessThan(slotStep(8));
  });

  it("انحياز التقريب عند المنتصف موثّق (JS يقرّب النصف نحو الموجب)", () => {
    // Math.round(-7.5) === -7 وليس -8 — نثبّت السلوك حتى لا يتغيّر صامتاً
    expect(Math.round(-7.5)).toBe(-7);
    expect(nearestIndex(-slotStep(8) * 7.5, 8)).toBe(7);
  });
});

describe("stepSpin", () => {
  it("ينقل خانة واحدة في الاتجاه المطلوب", () => {
    const s = spinForIndex(2, 8);
    expect(nearestIndex(stepSpin(s, 1, 8), 8)).toBe(1);
    expect(nearestIndex(stepSpin(s, -1, 8), 8)).toBe(3);
  });

  it("n = 1 يدور دورة كاملة بدل أن يقف مكانه", () => {
    expect(stepSpin(0, 1, 1)).toBeCloseTo(TAU, 12);
  });
});

describe("pxToRadians", () => {
  it("خانة كاملة عند إزاحة المرجع", () => {
    expect(pxToRadians(120, 8, 120)).toBeCloseTo(slotStep(8), 12);
    expect(pxToRadians(-60, 8, 120)).toBeCloseTo(-slotStep(8) / 2, 12);
  });

  it("يحمي من مقام صفري أو سالب", () => {
    expect(pxToRadians(50, 8, 0)).toBe(0);
    expect(pxToRadians(50, 8, -10)).toBe(0);
  });
});

describe("frontness", () => {
  it("صفر للخانة الأمامية", () => {
    expect(frontness(3, spinForIndex(3, 8), 8)).toBeCloseTo(0, 12);
  });

  it("متماثل للخانتين المجاورتين", () => {
    const s = spinForIndex(3, 8);
    expect(frontness(2, s, 8)).toBeCloseTo(frontness(4, s, 8), 12);
  });

  it("يبلغ 1 للخانة المقابلة تماماً", () => {
    expect(frontness(4, spinForIndex(0, 8), 8)).toBeCloseTo(1, 12);
  });
});

describe("nearestSpinForIndex", () => {
  it("يضع الخانة المطلوبة في المقدمة", () => {
    expect(nearestIndex(nearestSpinForIndex(0, 5, 8), 8)).toBe(5);
  });

  it("يبقى في جوار الدورة الحالية بدل العودة إلى الصفر", () => {
    const s = 1000 * TAU;
    const out = nearestSpinForIndex(s, 5, 8);
    expect(Math.abs(out - s)).toBeLessThanOrEqual(TAU / 2 + 1e-9);
    expect(nearestIndex(out, 8)).toBe(5);
  });

  it("لا يتحرك إن كانت الخانة في المقدمة أصلاً", () => {
    const s = spinForIndex(3, 8) - 7 * TAU;
    expect(nearestSpinForIndex(s, 3, 8)).toBeCloseTo(s, 10);
  });
});
