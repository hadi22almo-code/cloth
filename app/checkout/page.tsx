import Link from "next/link";
import type { Metadata } from "next";
import { CheckoutForm } from "./CheckoutForm";
import { WALLETS } from "@/lib/shop-config";
import { canWriteOrders } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "إتمام الطلب — قرص الألوان" };

export default function CheckoutPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <nav className="mb-6">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          → العودة إلى القرص
        </Link>
      </nav>

      <h1 className="mb-6 text-2xl font-bold">إتمام الطلب</h1>

      <CheckoutForm wallets={WALLETS} ordersEnabled={canWriteOrders()} />
    </main>
  );
}
