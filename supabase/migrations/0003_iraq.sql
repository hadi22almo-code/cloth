-- ═══════════════════════════════════════════════════════════════
-- التحوّل إلى السوق العراقي
--   • العملة: دينار عراقي
--   • الدفع: عند الاستلام، أو تحويل إلى محفظة مع إيصال
-- بوابات البطاقات العالمية لا تخدم العراق، فحُذف مسارها من المشروع.
--
-- شغّل 0001 ثم 0002 قبل هذا الملف. وهو محصّن: يُنشئ ما ينقص بدل أن يفشل،
-- ويمكن تكرار تشغيله بلا ضرر.
-- ═══════════════════════════════════════════════════════════════

-- ── 1) نوع طريقة الدفع ──────────────────────────────────────────
-- إن كان النوع غائباً (لم يُشغَّل 0002 بعد) نُنشئه كاملاً، وإلا نضيف القيمة.
-- ALTER TYPE ... ADD VALUE مسموح داخل معاملة منذ Postgres 12، بشرط ألا
-- تُستعمل القيمة الجديدة في المعاملة نفسها — ولا يستعملها أي سطر أدناه.
do $$
begin
  if not exists (
    select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typname = 'payment_method'
  ) then
    create type public.payment_method as enum ('cod', 'card', 'transfer');
  else
    execute 'alter type public.payment_method add value if not exists ''transfer''';
  end if;
end $$;

-- ── 2) أعمدة التحويل ────────────────────────────────────────────
-- wallet_id: أي محفظة اختار العميل. receipt_path: مسار صورة الإيصال داخل
-- مخزن Supabase الخاص المسمّى receipts.
alter table public.orders
  add column if not exists wallet_id    text,
  add column if not exists receipt_path text;

-- لم يعد لـStripe وجود في المشروع
alter table public.orders drop column if exists stripe_session_id;

-- ── 3) العملة ───────────────────────────────────────────────────
alter table public.products alter column currency set default 'IQD';
alter table public.orders   alter column currency set default 'IQD';

-- المنتج المبذور وحده يُعاد تسعيره. لا نلمس أسعار منتجات أخرى: تحويل عملة
-- بمبلغ ثابت ليس تحويلاً بل طمس للسعر الأصلي بلا رجعة.
update public.products
   set currency = 'IQD',
       price    = 25000
 where slug = 'tshirt-classic'
   and currency = 'SAR';

-- الطلبات القائمة تحتفظ بعملتها: تغيير الوسم دون تحويل المبلغ يزوّر سجلاً
-- تاريخياً. الافتراض الجديد يسري على الطلبات القادمة فقط.

-- ── 4) مخزن الإيصالات ───────────────────────────────────────────
-- خاص: لا قراءة عامّة. الرفع من الخادم بمفتاح الخدمة، والعرض في لوحة الإدارة
-- عبر روابط موقّعة قصيرة العمر — فلا يحتاج أي سياسة على storage.objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts', 'receipts', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── 5) تسجيل الطلب في معاملة واحدة ──────────────────────────────
-- الإدراج وخصم المخزون معاً: أي نقص في المخزون يُلغي الطلب بالكامل.
-- بدون هذا، طلبان متزامنان يمرّان من فحص التوفّر ثم يفشل أحد الخصمين بعد
-- أن يكون الطلب قد سُجّل — فيخرج العميل بطلب مؤكَّد لبضاعة غير موجودة.
--
-- الأسعار تصل محسوبة من الخادم بعد قراءتها من هذا الجدول نفسه؛ الدالة لا
-- تثق بأي شيء يرسله المتصفّح لأنها لا تُستدعى إلا بمفتاح الخدمة.
create or replace function public.place_order(
  p_customer jsonb,
  p_payment  public.payment_method,
  p_wallet   text,
  p_currency text,
  p_subtotal numeric,
  p_shipping numeric,
  p_total    numeric,
  p_items    jsonb
)
returns table (order_id uuid, order_reference text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item     jsonb;
  v_order_id uuid;
  v_ref      text;
  v_qty      integer;
begin
  insert into public.orders (
    payment_method, wallet_id, customer_name, phone, city, address, notes,
    subtotal, shipping, total, currency
  )
  values (
    p_payment,
    nullif(p_wallet, ''),
    p_customer ->> 'name',
    p_customer ->> 'phone',
    p_customer ->> 'city',
    p_customer ->> 'address',
    nullif(p_customer ->> 'notes', ''),
    p_subtotal, p_shipping, p_total, p_currency
  )
  returning orders.id, orders.reference into v_order_id, v_ref;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;

    insert into public.order_items (order_id, variant_id, size_label, quantity, unit_price)
    values (
      v_order_id,
      (v_item ->> 'variant_id')::uuid,
      v_item ->> 'size_label',
      v_qty,
      (v_item ->> 'unit_price')::numeric
    );

    -- الشرط داخل عبارة التحديث نفسها هو ما يمنع البيع الزائد ذرّياً
    update public.product_variants pv
       set stock = pv.stock - v_qty
     where pv.id = (v_item ->> 'variant_id')::uuid
       and pv.stock >= v_qty;

    if not found then
      raise exception 'المخزون غير كافٍ لأحد الألوان المطلوبة'
        using errcode = 'P0001';
    end if;
  end loop;

  return query select v_order_id, v_ref;
end;
$$;

revoke all on function public.place_order(jsonb, public.payment_method, text, text, numeric, numeric, numeric, jsonb) from anon, authenticated;
