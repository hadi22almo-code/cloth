"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** ما يُرسم أثناء حالة الخطأ. يجب أن يكون صالحاً داخل الكانفس. */
  fallback?: ReactNode;
  onError: (error: Error) => void;
}

interface State {
  failed: boolean;
}

/**
 * حدود خطأ تعمل **داخل** الكانفس (مُوفِّق R3F يدعم مكوّنات الصنف كأي شجرة React).
 *
 * فشل تحميل ملف الموديل لا يجوز أن يسقط المشهد كله: نلتقط الخطأ، ونبلّغ
 * الأعلى ليعيد الرسم بالمجسّم المولّد بالكود، فيبقى العرض حيّاً.
 */
export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
