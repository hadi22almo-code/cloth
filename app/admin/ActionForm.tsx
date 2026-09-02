"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "./actions";

const EMPTY: ActionState = {};

/**
 * نموذج يعرض نتيجة الإجراء بدل ابتلاعها.
 *
 * قبل هذا: أي مدخل غير صالح كان يُسقط اللوحة كلها إلى شاشة خطأ إنجليزية،
 * وأي حفظ ناجح كان يمرّ بلا أي إشارة — فيبقى المدير يخمّن هل حُفظ أم لا.
 * useActionState يعيد الحالة من الخادم إلى الصفحة بلا تحويلها إلى مكوّن عميل.
 */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY);

  return (
    <form action={formAction} className={className}>
      {children}

      {pending && (
        <p className="basis-full text-xs text-muted">جارٍ الحفظ…</p>
      )}

      {!pending && state.error && (
        <p
          role="alert"
          className="basis-full rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-200"
        >
          {state.error}
        </p>
      )}

      {!pending && state.ok && (
        <p role="status" className="basis-full text-xs text-accent">
          {state.ok} ✓
        </p>
      )}
    </form>
  );
}
