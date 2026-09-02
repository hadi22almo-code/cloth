-- ═══════════════════════════════════════════════════════════════
-- مخزن صور المنتجات
--
-- **عام** بعكس مخزن الإيصالات: صور المتجر يجب أن تُحمَّل في متصفّح الزبون
-- مباشرةً بلا توقيع. الروابط الموقّعة تنتهي صلاحيتها، ولا تصلح لصور تُعرض
-- لكل زائر ولا تُخزَّن في ذاكرة المتصفّح.
--
-- الرفع يمرّ بالخادم بمفتاح الخدمة، فلا حاجة لأي سياسة كتابة.
-- ═══════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products', 'products', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
