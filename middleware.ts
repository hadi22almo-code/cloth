import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * يجدّد جلسة Supabase على كل طلب لمسارات الإدارة ويحمي `/admin`.
 *
 * التجديد يجب أن يتم هنا تحديداً: مكوّنات الخادم لا تستطيع كتابة الكوكيز،
 * فبدون هذا الوسيط تنتهي الجلسة بصمت أثناء التصفّح.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const response = NextResponse.next({ request });

  // بلا مفاتيح لا توجد مصادقة؛ صفحة الإدارة نفسها تشرح ما ينقص
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path.startsWith("/admin/login");

  if (!user && !isLogin) {
    const to = request.nextUrl.clone();
    to.pathname = "/admin/login";
    to.searchParams.set("next", path);
    return NextResponse.redirect(to);
  }

  if (user && isLogin) {
    const to = request.nextUrl.clone();
    to.pathname = "/admin/orders";
    to.search = "";
    return NextResponse.redirect(to);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
