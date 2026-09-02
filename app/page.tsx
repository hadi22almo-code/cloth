import { Suspense } from "react";
import { ShowroomClient } from "./ShowroomClient";
import { getProduct } from "@/lib/queries/products";

/**
 * useSearchParams يُخرج المسار من التصيير الساكن ما لم يكن داخل حدّ Suspense،
 * وبدونه يفشل next build برسالة صريحة.
 */
export default async function Home() {
  // من Supabase عند توفّر المفاتيح، وإلا من البيانات المحلية
  const { product } = await getProduct();

  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center">
          <p className="text-sm text-muted">جارٍ التحضير…</p>
        </div>
      }
    >
      <ShowroomClient product={product} />
    </Suspense>
  );
}
