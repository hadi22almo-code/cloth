import "server-only";

/**
 * حدّ معدّل بسيط في ذاكرة العملية.
 *
 * **حدوده الصادقة**: الذاكرة لا تُشارَك بين نسخ الخادم. على منصّة بلا حالة
 * (Vercel/Lambda) يصبح الحدّ لكل نسخة لا لكل موقع، فيتجاوزه مهاجم موزّع.
 * البديل الصحيح للإنتاج الجادّ هو Upstash Redis أو حدّ على مستوى الحافة.
 * لكن هذا يوقف الحالة الواقعية: سكربت واحد يرشق مئات الطلبات من عنوان واحد،
 * وهي بالضبط الثغرة التي أثبتها الفحص (٦٠ طلباً بلا أي صدّ).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** تنظيف دوري حتى لا تنمو الخريطة بلا حدّ مع كثرة العناوين. */
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** ثوانٍ حتى فتح النافذة التالية؛ تُرسل في ترويسة Retry-After. */
  retryAfter: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/**
 * عنوان العميل خلف وسيط عكسي.
 * `x-forwarded-for` قابل للتزوير من العميل مباشرةً، لكنه يُعاد كتابته على
 * المنصّات المُدارة. نأخذ أول عنوان في السلسلة وهو الأقرب للعميل الحقيقي.
 */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}
