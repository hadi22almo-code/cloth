"use client";

/**
 * تنسيق السعر.
 *
 * الأرقام **غربية دائماً** بلا استثناء: `Intl` بلغة عربية يقلبها إلى هندية
 * حسب المنطقة، وخلط النظامين في الصفحة الواحدة يبدو إهمالاً. لذا نُنسّق العدد
 * بـ`en-US` — يضمن الأرقام الغربية والفاصلة الألفية — ونُلحق رمز العملة بأنفسنا.
 *
 * وإلحاق الرمز يدوياً يحلّ مشكلة ثانية: `Intl` يُخرج «د.ع.» بنقطة أخيرة تنفصل
 * في الاتجاه من اليمين لليسار فتبدو نقطة شاردة في آخر السطر.
 *
 * عزل <bdi> يمنع خوارزمية bidi من إعادة ترتيب الرقم مع النص العربي حوله.
 */
const SYMBOLS: Record<string, string> = {
  IQD: "د.ع",
  SAR: "ر.س",
  USD: "$",
  EUR: "€",
};

const digits = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function Price({
  value,
  currency,
  className,
}: {
  value: number;
  currency: string;
  className?: string;
}) {
  const symbol = SYMBOLS[currency] ?? currency;
  return (
    <bdi className={className}>
      {digits.format(value)} {symbol}
    </bdi>
  );
}
