import path from "node:path";
import type { NextConfig } from "next";

/** نطاق مخزن Supabase يُقرأ من البيئة: لا نثبّت معرّف مشروع في الكود. */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  // يوجد package-lock.json آخر أعلى في شجرة المجلدات، فنثبّت جذر المشروع صراحةً
  outputFileTracingRoot: path.resolve(process.cwd()),
  /**
   * ترويسات أمان أساسية. أهمّها frame-ancestors: بدونها يمكن وضع لوحة الإدارة
   * في إطار خفي وخداع المدير للنقر على «إلغاء» أو «حذف» وهو يظنّه شيئاً آخر.
   *
   * CSP هنا متساهلة عمداً مع السكربتات: Next في وضع التطوير يحتاج eval،
   * وتشديدها يحتاج nonce لكل طلب. شدّدها قبل الإطلاق الحقيقي.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next يحقن سكربتات مضمّنة للترطيب، ووضع التطوير يحتاج eval.
              // متساهلة عمداً؛ التشديد يحتاج nonce لكل طلب — افعله قبل الإطلاق.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "worker-src 'self' blob:",
              // صور المنتجات تُقدَّم من مخزن Supabase العام
              "img-src 'self' data: blob: https://*.supabase.co",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  experimental: {
    // drei حزمة ضخمة؛ هذا يقلّص كلفة الاستيراد في التطوير
    optimizePackageImports: ["@react-three/drei"],
  },
};

export default nextConfig;
