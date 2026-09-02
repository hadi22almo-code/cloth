-- ═══════════════════════════════════════════════════════════════
-- الطلبات: الدفع عند الاستلام والبطاقة
-- لا سياسة قراءة أو كتابة عامّة إطلاقاً — الإدراج يتم من الخادم
-- بمفتاح الخدمة بعد إعادة حساب السعر، والقراءة للمدراء فقط.
-- ═══════════════════════════════════════════════════════════════

do $$ begin
  create type public.order_status as enum
    ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cod', 'card');
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  -- رقم قصير يُعطى للعميل بدل الـUUID
  reference         text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  status            public.order_status not null default 'pending',
  payment_method    public.payment_method not null,
  customer_name     text not null,
  phone             text not null,
  city              text not null,
  address           text not null,
  notes             text,
  subtotal          numeric(10, 2) not null check (subtotal >= 0),
  shipping          numeric(10, 2) not null default 0 check (shipping >= 0),
  total             numeric(10, 2) not null check (total >= 0),
  currency          text not null default 'SAR',
  stripe_session_id text unique,
  created_at        timestamptz not null default now()
);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  size_label text not null,
  quantity   integer not null check (quantity > 0),
  -- السعر لحظة الطلب: تغيير سعر المنتج لاحقاً لا يغيّر الطلبات القديمة
  unit_price numeric(10, 2) not null check (unit_price >= 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists orders_created_idx on public.orders (created_at desc);

alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- لا سياسة للعامّة: أي وصول يمرّ بمفتاح الخدمة على الخادم
drop policy if exists orders_admin on public.orders;
create policy orders_admin on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_items_admin on public.order_items;
create policy order_items_admin on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- خصم المخزون ذرّياً عند تأكيد الطلب
-- ═══════════════════════════════════════════════════════════════
create or replace function public.decrement_stock(
  p_variant_id uuid,
  p_quantity   integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.product_variants
     set stock = stock - p_quantity
   where id = p_variant_id
     and stock >= p_quantity;

  if not found then
    raise exception 'المخزون غير كافٍ للّون المطلوب';
  end if;
end;
$$;
