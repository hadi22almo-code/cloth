import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
  serviceRoleKey,
} from "./config";

/**
 * عميل الخادم المرتبط بجلسة المستخدم (يُستخدم في لوحة الإدارة).
 * يقرأ الكوكيز ويكتبها ليبقى التوكن محدّثاً عبر الطلبات.
 */
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured) return null;
  const store = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          // الكتابة ممنوعة داخل Server Component؛ الـmiddleware يتكفّل بالتحديث
        }
      },
    },
  });
}

/**
 * عميل مفتاح الخدمة: يتخطّى سياسات الصفوف.
 * لا يُستدعى إلا من معالجات المسارات على الخادم — أي تسريب لهذا المفتاح إلى
 * المتصفّح يفتح قاعدة البيانات بالكامل.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const key = serviceRoleKey();
  if (!SUPABASE_URL || !key) return null;

  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
