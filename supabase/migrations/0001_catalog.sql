-- ⚠️ شغّل هذه الهجرات في مشروع Supabase **مخصّص للمتجر وحده**.
-- تُنشئ جداول بأسماء عامّة (products, orders) ودالة is_admin() في مخطّط
-- public المشترك. تشغيلها في مشروع يحوي تطبيقاً آخر قد يستبدل دوالّه ويُفعّل
-- حماية الصفوف على جداوله. تحقّق من معرّف المشروع في شريط العنوان أولاً.

-- ═══════════════════════════════════════════════════════════════
-- الكتالوج: المنتجات وألوانها ومقاساتها
-- كل صف في product_variants هو تيشيرت واحد على القرص الدوّار.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name_ar        text not null,
  description_ar text not null default '',
  -- السعر بوحدة العملة الأساسية (ريال) لا بالهللات
  price          numeric(10, 2) not null check (price >= 0),
  currency       text not null default 'SAR',
  model_path     text not null default '/models/tshirt.glb',
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists public.product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  -- يظهر في الرابط: ?color=azraq
  slug          text not null,
  color_name_ar text not null,
  color_hex     text not null check (color_hex ~ '^#[0-9a-fA-F]{6}$'),
  image_url     text,
  stock         integer not null default 0 check (stock >= 0),
  -- ترتيب اللون على الحلقة
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (product_id, slug)
);

create table if not exists public.product_sizes (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label      text not null,
  stock      integer not null default 0 check (stock >= 0),
  position   integer not null default 0,
  unique (product_id, label)
);

create index if not exists product_variants_product_idx
  on public.product_variants (product_id, position);
create index if not exists product_sizes_product_idx
  on public.product_sizes (product_id, position);

-- ═══════════════════════════════════════════════════════════════
-- الصلاحيات
-- ═══════════════════════════════════════════════════════════════

-- جدول المدراء: العضوية فيه هي ما يمنح حق الكتابة
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- security definer حتى لا تحتاج السياسات صلاحية قراءة على admins نفسه
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

alter table public.products        enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_sizes    enable row level security;
alter table public.admins           enable row level security;

-- القراءة مفتوحة للجميع: هذه واجهة متجر عامّة
drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select using (is_active);

drop policy if exists variants_read on public.product_variants;
create policy variants_read on public.product_variants
  for select using (true);

drop policy if exists sizes_read on public.product_sizes;
create policy sizes_read on public.product_sizes
  for select using (true);

-- الكتابة للمدراء فقط
drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists variants_write on public.product_variants;
create policy variants_write on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists sizes_write on public.product_sizes;
create policy sizes_write on public.product_sizes
  for all using (public.is_admin()) with check (public.is_admin());

-- كل مدير يرى صفّه فقط؛ الإضافة تتم بمفتاح الخدمة أو من لوحة Supabase
drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins
  for select using (user_id = auth.uid());
