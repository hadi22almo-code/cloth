"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MAX_QTY_PER_ITEM, shippingFor } from "@/lib/shop-config";

export interface CartLine {
  productSlug: string;
  variantSlug: string;
  sizeLabel: string;
  quantity: number;
  /** حقول عرض فقط — الخادم يعيد حساب السعر من قاعدة البيانات ولا يثق بها. */
  nameAr: string;
  colorNameAr: string;
  colorHex: string;
  unitPrice: number;
  currency: string;
}

export function lineKey(
  line: Pick<CartLine, "productSlug" | "variantSlug" | "sizeLabel">,
): string {
  return `${line.productSlug}|${line.variantSlug}|${line.sizeLabel}`;
}

interface CartState {
  lines: CartLine[];
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],

      add: (line, quantity = 1) =>
        set((state) => {
          const key = lineKey(line);
          const existing = state.lines.find((l) => lineKey(l) === key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                lineKey(l) === key
                  ? {
                      ...l,
                      quantity: Math.min(
                        MAX_QTY_PER_ITEM,
                        l.quantity + quantity,
                      ),
                    }
                  : l,
              ),
            };
          }
          return {
            lines: [
              ...state.lines,
              { ...line, quantity: Math.min(MAX_QTY_PER_ITEM, quantity) },
            ],
          };
        }),

      setQuantity: (key, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => lineKey(l) !== key)
              : state.lines.map((l) =>
                  lineKey(l) === key
                    ? { ...l, quantity: Math.min(MAX_QTY_PER_ITEM, quantity) }
                    : l,
                ),
        })),

      remove: (key) =>
        set((state) => ({ lines: state.lines.filter((l) => lineKey(l) !== key) })),

      clear: () => set({ lines: [] }),
    }),
    {
      // رُقّي المفتاح مع تغيير العملة: السلال المحفوظة تحمل أسعار الريال،
      // فخلطها مع إجماليات الدينار يعرض عملتين معاً ومجموعاً لا يطابق ما
      // يحسبه الخادم. الترقية تُسقط القديم بدل أن تعرضه.
      name: "cloth-cart-v2",
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);

/**
 * السلة تعيش في التخزين المحلي، فالخادم يصيّر سلة فارغة دائماً.
 * الاعتماد على `lines` قبل انتهاء الاسترجاع يعطي تعارض ترطيب، لذا نؤجّل عرض
 * كل ما يعتمد عليها حتى تنتهي.
 */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useCart.persist.hasHydrated()) setHydrated(true);
    return useCart.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.quantity, 0);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}

export function cartTotals(lines: CartLine[]) {
  const subtotal = cartSubtotal(lines);
  const shipping = shippingFor(subtotal);
  return { subtotal, shipping, total: subtotal + shipping };
}
