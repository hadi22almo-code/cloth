import { Vector3 } from "three";
import { TAU } from "./carousel-math";

/**
 * كل مقبض ضبط للمشهد في ملف واحد.
 * ضبط "إحساس" التجربة يتم بتعديل هذا الملف فقط، لا بمطاردة أرقام سحرية
 * موزّعة على خمسة مكوّنات.
 */

/* ————— الحلقة ————— */

/** العرض التقريبي للقميص بوحدات العالم؛ يقود حساب نصف القطر. */
export const ITEM_WIDTH = 0.9;

/** هامش بين القمصان المتجاورة (1 = متلاصقة). */
export const ITEM_GAP_FACTOR = 1.6;

/** نصف قطر الحلقة يكبر مع عدد الألوان، وإلا تداخلت القمصان عند n ≥ 10. */
export function ringRadius(n: number): number {
  return Math.max(3.2, (n * ITEM_WIDTH * ITEM_GAP_FACTOR) / TAU);
}

/* ————— الدوران ————— */

/** كم بكسل سحب يساوي خانة كاملة. مستقل عن عرض الشاشة. */
export const DRAG_PX_PER_SLOT = 120;

/** معامل الاحتكاك الأسّي: vel *= exp(-FRICTION · dt) — مستقل عن معدل الإطارات. */
export const FRICTION = 2.4;

/** أقصى سرعة زاوية بعد القذف (راديان/ثانية). */
export const MAX_VELOCITY = 9;

/** تحت هذه السرعة ننتقل من طور الاحتكاك إلى طور التثبيت. */
export const VELOCITY_EPS = 0.12;

/**
 * زمن نعومة التثبيت على أقرب خانة (ثوانٍ).
 * ٠٫٣٤ يعطي استقراراً أهدأ وأقلّ «انتزاعاً» من ٠٫٢٨ بلا أن يبدو بطيئاً.
 */
export const SNAP_SMOOTH = 0.34;

/** سرعة الدوران التلقائي عند الخمول (راديان/ثانية). */
export const IDLE_SPIN_SPEED = 0.16;

/** كم ثانية سكون قبل أن يبدأ الدوران التلقائي. */
export const IDLE_DELAY = 2.5;

/** تضخيم إزاحة العجلة مقارنةً بالسحب. */
export const WHEEL_GAIN = 0.55;

/** كم مللي ثانية بعد آخر حدث عجلة نبدأ التثبيت. */
export const WHEEL_SETTLE_MS = 130;

/**
 * اتجاه الأسهم مكاني لا ترتيبي: السهم الأيمن يحرّك القمصان يميناً في العربية
 * والإنجليزية سواء. غيّر هذا الثابت وحده لو أردت العكس.
 */
export const KEY_SPATIAL_DIR = 1;

/* ————— أقصى قفزة زمنية ————— */

/**
 * بعد تبديل تبويب أو توقّف مصحّح، delta قد يبلغ ثوانٍ فتقفز الحلقة.
 *
 * ١/٢٠ لا ١/٣٠: القصّ الضيّق يجعل الحركة **تتباطأ عن الساعة** على جهاز يعمل
 * بأقل من ٣٠ إطاراً — فتُقرأ كتلكؤ لا كحماية. هذا الحدّ يحافظ على السرعة
 * الحقيقية حتى ٢٠ إطاراً، وما دونه يستحقّ الحماية فعلاً.
 */
export const MAX_DELTA = 1 / 20;

/* ————— الكاميرا ————— */

/** عدسة طويلة نسبياً: تشويه منظوري أقل على أطراف الحلقة. */
export const CAM_FOV = 35;
export const CAM_NEAR = 0.1;
export const CAM_FAR = 60;

/** ارتفاع نظر الكاميرا (منتصف الصدر تقريباً). */
export const CHEST_Y = 0.55;

/**
 * مسافة كاميرا الحلقة، محسوبة من نسبة الشاشة.
 *
 * كانت ثابتة (`radius + 5.2`) فانكسرت في اتجاهين:
 * على الشاشة الضيّقة يُقصّ القميصان الجانبيان نصفين، وعلى العريضة تُؤطَّر
 * الحلقة كلها فيصير ثلث أعلى الشاشة فراغاً أسود لأن الارتفاع مُغطّى بإفراط
 * بينما المطلوب هو العرض.
 *
 * نُؤطّر **القميص الأمامي وجارَيه** لا الحلقة كاملة: قصّ ما بعدهما مقصود في
 * أي قرص دوّار، وهو ما يوحي بالاستمرار.
 */
export function ringDistance(radius: number, aspect: number): number {
  const halfH = Math.tan((CAM_FOV * Math.PI) / 180 / 2);
  const halfW = halfH * Math.max(aspect, 0.3);

  /*
   * القاعدة: **حجم القميص ثابت** عبر كل الشاشات (نحو ثلث الارتفاع)، وما يُرى
   * من الحلقة حوله هو ما يتبع عرض الشاشة.
   *
   * العكس — أن يقود العرضُ المسافةَ — هو ما كسر التأطير: على الشاشة العريضة
   * تُؤطَّر الحلقة كاملة فتُغطّى الرأسية بإفراط ويصير ثلث الشاشة فراغاً، وعلى
   * الضيّقة تبتعد الكاميرا حتى يصير المنتج نقطة.
   */
  const forHeight = 0.92 / halfH;

  // كم من الحلقة نطمح لعرضه: كلّها على العريضة، والمقدّمة وحدها على الضيّقة
  const reach = Math.min(Math.max((aspect - 0.4) / 1.2, 0), 1);
  const span = 0.72 + radius * 0.62 * reach;
  const forWidth = span / halfW;

  const wanted = Math.max(forWidth, forHeight);
  // حدّان يمنعان الاقتراب المُشوِّه والابتعاد الذي يُصغّر المنتج
  return Math.min(Math.max(wanted, radius + 1.2), radius + 5);
}

/** وضعية كاميرا الحلقة: تنظر إلى مركز الحلقة. */
export function ringCameraPos(radius: number, distance: number): Vector3 {
  // الارتفاع يتبع المسافة: زاوية النظر تبقى ثابتة مهما اقتربت الكاميرا
  return new Vector3(0, 0.5 + distance * 0.2, radius + distance);
}
// هدف أخفض قليلاً من مركز القميص يرفعه في الكادر ويقلّص الفراغ العلوي
export const RING_CAM_TARGET = new Vector3(0, 0.3, 0);

/* ————— تأطير المنتج ————— */

/** نصف عرض القميص وارتفاعه مع هامش تنفّس. */
export const SUBJECT_HALF_W = 0.58;
export const SUBJECT_HALF_H = 0.6;

/** أقرب مسافة مسموحة مهما كانت الشاشة. */
const MIN_FOCUS_DISTANCE = 1.8;

/**
 * المسافة التي يتّسع عندها القميص **عرضاً وارتفاعاً معاً**.
 *
 * المسافة الثابتة كانت تقصّ الكمّين على شاشة الهاتف: مجال الرؤية العمودي
 * ثابت، فكلّما ضاقت النسبة ضاق المجال الأفقي — وعلى 390×844 تصبح النسبة 0.46
 * فيخرج الكمّان عن الإطار.
 *
 * `usableHeight` نصيب الارتفاع غير المحجوب بلوحة المنتج: على الهاتف تجلس
 * اللوحة أسفل الشاشة فيبقى للقميص جزء منه فقط.
 */
export function focusDistance(
  aspect: number,
  usableHeight: number,
  lateral = 0,
): number {
  const halfH = Math.tan((CAM_FOV * Math.PI) / 180 / 2);
  const halfW = halfH * aspect;
  // الإزاحة الجانبية تُبعد المنتج عن مركز الإطار، فيجب أن يتّسع نصف العرض
  // لها أيضاً — بدونها يخرج المنتج من الحافة على الشاشات العريضة
  const forWidth = (SUBJECT_HALF_W + Math.abs(lateral)) / halfW;
  const forHeight = SUBJECT_HALF_H / (halfH * Math.max(usableHeight, 0.25));
  return Math.max(forWidth, forHeight, MIN_FOCUS_DISTANCE);
}

/**
 * كم يُخفَض هدف النظر ليصعد القميص إلى الجزء غير المحجوب من الإطار.
 * خفض الهدف يرفع الجسم في الكادر — وهو ما نحتاجه حين تحتلّ اللوحة أسفل الشاشة.
 */
export function focusLift(distance: number, usableHeight: number): number {
  const halfH = Math.tan((CAM_FOV * Math.PI) / 180 / 2);
  const visibleHeight = 2 * distance * halfH;
  return ((1 - Math.min(usableHeight, 1)) / 2) * visibleHeight;
}

/**
 * الخانة الأمامية نقطة عالمية ثابتة [0, 0, R] لأن المجموعة تدور ولا تنتقل،
 * لذا وضعية التقريب تُحسب من الشاشة وحدها لا من اللون.
 */
export function focusCameraPos(
  radius: number,
  lateral: number,
  distance: number,
  lift: number,
): Vector3 {
  return new Vector3(lateral, CHEST_Y + 0.07 - lift, radius + distance);
}

export function focusCameraTarget(
  radius: number,
  lateral: number,
  lift: number,
): Vector3 {
  return new Vector3(lateral, CHEST_Y - 0.03 - lift, radius);
}

/**
 * الإزاحة الجانبية تُطبَّق على الموضع **والهدف معاً** — إزاحة الموضع وحده
 * تُميل الكاميرا فتشوّه القميص. القيمة موجبة تزيح المشهد بعيداً عن لوحة المنتج.
 */
export const PANEL_OFFSET_X = 0.6;

export const SMOOTH_FOCUS = 0.62;
export const SMOOTH_RETURN = 0.52;

/** مهلة قصوى للانتقال حتى لا نعلق في حالة focusing لو تعثّر المخمِّد. */
export const ARRIVE_TIMEOUT_MS = 1600;

/** حدود التدوير اليدوي بعد الوصول، كنِسَب من مسافة الوصول الفعلية. */
export const ORBIT_MIN_DISTANCE_FACTOR = 0.75;
export const ORBIT_MAX_DISTANCE_FACTOR = 1.6;
export const ORBIT_MIN_POLAR = Math.PI * 0.3;
export const ORBIT_MAX_POLAR = Math.PI * 0.62;

/* ————— المظهر ————— */

/** زمن تلاشي/عودة القمصان غير المختارة. */
export const FADE_SMOOTH = 0.38;

/** تحت هذه الشفافية نطفئ الرسم كلياً. */
export const OPACITY_CUTOFF = 0.01;

/** تكبير القميص الأمامي في وضع الحلقة. */
export const ACTIVE_SCALE = 1.12;

/** كم يبتعد القميص شعاعياً أثناء التلاشي. */
export const FADE_PUSH = 0.9;

export const FOG_COLOR = "#101014";
