/**
 * رياضيات القرص الدوّار — دوال خالصة بلا أي تبعية (لا React ولا three).
 *
 * الاصطلاحات المعتمدة في كل الملف:
 * - المجموعة الدوّارة تحمل زاوية `spin` بالراديان، وهي **غير مطبَّعة أبداً**
 *   (تتراكم بحرية موجباً وسالباً). هذا ما يجعل التثبيت على أقرب خانة محلياً
 *   دائماً، فتختفي مشكلة الالتفاف حول 2π من جذورها.
 * - الخانة `i` تجلس عند الزاوية المحلية `i · 2π/n`، والخانة الأمامية هي التي
 *   زاويتها العالمية ≡ 0.
 */

export const TAU = Math.PI * 2;

/** باقي قسمة موجب دائماً. mod(-1, 8) === 7. لا يعيد -0 أبداً. */
export function mod(a: number, m: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(m) || m === 0) return 0;
  const r = a % m;
  // الجمع مع صفر يحوّل -0 إلى 0 (مهم لو استُخدمت القيمة كمفتاح React)
  return (r < 0 ? r + m : r) + 0;
}

/** المسافة الزاوية بين خانتين متجاورتين. يحمي من القسمة على صفر. */
export function slotStep(n: number): number {
  return n > 0 ? TAU / n : TAU;
}

/** الزاوية المحلية للخانة i داخل المجموعة. */
export function slotAngle(i: number, n: number): number {
  return mod(i, n) * slotStep(n);
}

/** يلفّ الزاوية إلى المجال [0, TAU). */
export function normalizeAngle(a: number): number {
  if (!Number.isFinite(a)) return 0;
  const r = a % TAU;
  const out = (r < 0 ? r + TAU : r) + 0;
  // الجمع أعلاه قد يُقرِّب إلى TAU بالضبط لقيم سالبة دقيقة جداً
  return out >= TAU ? 0 : out;
}

/** يلفّ الزاوية إلى المجال (-π, π]. الاصطلاح: الطرفان يُعادان كـ +π. */
export function signedAngle(a: number): number {
  const r = normalizeAngle(a);
  return r > Math.PI ? r - TAU : r;
}

/** أقصر دوران مُوقَّع من from إلى to. النتيجة دائماً في (-π, π]. */
export function shortestDelta(from: number, to: number): number {
  return signedAngle(to - from);
}

/** قيمة spin التي تضع الخانة i في المقدمة. */
export function spinForIndex(i: number, n: number): number {
  return -slotAngle(i, n);
}

/** الخانة الأقرب للمقدمة عند spin الحالي. */
export function nearestIndex(spin: number, n: number): number {
  if (n <= 0) return 0;
  return mod(Math.round(-spin / slotStep(n)), n);
}

/**
 * أقرب قيمة تثبيت في جوار spin المحلي — لا تلتفّ ولا تأخذ الطريق الطويل،
 * لأن spin غير مطبَّع.
 */
export function nearestSpin(spin: number, n: number): number {
  const step = slotStep(n);
  return Math.round(spin / step) * step;
}

/**
 * أقرب قيمة spin تضع الخانة i في المقدمة، **في جوار spin الحالي**.
 * لولا هذا لعاد القرص إلى الدورة صفر فلفّ عشرات اللفّات عند الضغط على Home.
 */
export function nearestSpinForIndex(
  spin: number,
  i: number,
  n: number,
): number {
  const base = spinForIndex(i, n);
  return base + Math.round((spin - base) / TAU) * TAU;
}

/** التقدّم k خانة من نقطة التثبيت الحالية. dir = +1 يحرّك المحتوى يميناً. */
export function stepSpin(spin: number, dir: 1 | -1, n: number, k = 1): number {
  return nearestSpin(spin, n) + dir * k * slotStep(n);
}

/** تحويل إزاحة السحب بالبكسل إلى راديان، مستقلاً عن عرض الشاشة. */
export function pxToRadians(dx: number, n: number, pxPerSlot: number): number {
  if (!(pxPerSlot > 0)) return 0;
  return (dx / pxPerSlot) * slotStep(n);
}

/** 0 للخانة في المقدمة تماماً، و1 للتي خلفها مباشرة. يقود التلاشي والتحجيم. */
export function frontness(i: number, spin: number, n: number): number {
  return Math.abs(signedAngle(slotAngle(i, n) + spin)) / Math.PI;
}
