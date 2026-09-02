import { createClient } from "@supabase/supabase-js";
import { tshirt } from "@/data/products";
import type { ColorVariant, Product, SizeOption } from "@/lib/types";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

/**
 * مصدر بيانات الكتالوج.
 *
 * بلا مفاتيح Supabase يرجع إلى `data/products.ts` فيبقى الموقع شغّالاً
 * بالكامل؛ ومع المفاتيح يقرأ من قاعدة البيانات. الواجهة المُعادة واحدة في
 * الحالتين، فلا يعرف أي مكوّن عرض من أين جاءت البيانات.
 */

interface VariantRow {
  slug: string;
  color_name_ar: string;
  color_hex: string;
  image_url: string | null;
  stock: number;
}

interface SizeRow {
  label: string;
  stock: number;
}

interface ProductRow {
  slug: string;
  name_ar: string;
  description_ar: string;
  price: number | string;
  currency: string;
  model_path: string;
  product_variants: VariantRow[];
  product_sizes: SizeRow[];
}

const SELECT = `
  slug, name_ar, description_ar, price, currency, model_path,
  product_variants ( slug, color_name_ar, color_hex, image_url, stock ),
  product_sizes ( label, stock )
`;

function readClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

function toProduct(row: ProductRow): Product {
  const variants: ColorVariant[] = row.product_variants.map((v) => ({
    slug: v.slug,
    nameAr: v.color_name_ar,
    hex: v.color_hex,
    image: v.image_url ?? undefined,
    stock: v.stock,
  }));

  const sizes: SizeOption[] = row.product_sizes.map((s) => ({
    label: s.label,
    stock: s.stock,
  }));

  return {
    slug: row.slug,
    nameAr: row.name_ar,
    descriptionAr: row.description_ar,
    // numeric في Postgres يصل كنص حفاظاً على الدقة
    price: Number(row.price),
    currency: row.currency,
    modelPath: row.model_path,
    variants,
    sizes,
  };
}

/**
 * يجلب منتجاً واحداً بالـslug. عند أي تعذّر — مفاتيح ناقصة، شبكة، صف مفقود —
 * يعيد البيانات المحلية بدل أن يُسقط الصفحة.
 */
export async function getProduct(
  slug = tshirt.slug,
): Promise<{ product: Product; source: "supabase" | "local" }> {
  if (!isSupabaseConfigured) return { product: tshirt, source: "local" };

  try {
    const { data, error } = await readClient()
      .from("products")
      .select(SELECT)
      .eq("slug", slug)
      .eq("is_active", true)
      .order("position", { referencedTable: "product_variants" })
      .order("position", { referencedTable: "product_sizes" })
      .single<ProductRow>();

    if (error || !data || data.product_variants.length === 0) {
      return { product: tshirt, source: "local" };
    }
    return { product: toProduct(data), source: "supabase" };
  } catch {
    return { product: tshirt, source: "local" };
  }
}
