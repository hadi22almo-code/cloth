"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "./config";

/** عميل المتصفّح — لتسجيل دخول لوحة الإدارة فقط. */
export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
