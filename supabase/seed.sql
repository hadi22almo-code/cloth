-- بيانات أوّلية مطابقة لما في data/products.ts
-- شغّلها بعد الهجرات: يمكن تكرار تشغيلها بلا ضرر.

insert into public.products (slug, name_ar, description_ar, price, currency, model_path)
values (
  'tshirt-classic',
  'تيشيرت قطن كلاسيكي',
  'قطن مُمشّط 100٪ بوزن 240 غرام، قصّة مستقيمة وياقة مضلّعة تحافظ على شكلها بعد الغسيل.',
  25000,
  'IQD',
  '/models/tshirt.glb'
)
on conflict (slug) do update
  set name_ar        = excluded.name_ar,
      description_ar = excluded.description_ar,
      price          = excluded.price;

insert into public.product_variants (product_id, slug, color_name_ar, color_hex, stock, position)
select p.id, v.slug, v.name_ar, v.hex, v.stock, v.position
from public.products p,
     (values
       ('aswad',  'أسود',         '#17171a', 24, 0),
       ('abyad',  'أبيض',         '#f2f0ec', 31, 1),
       ('ramadi', 'رمادي',        '#8b8d93', 18, 2),
       ('kuhli',  'كحلي',         '#1e2f52', 12, 3),
       ('ahmar',  'أحمر قاني',    '#a81f2b',  9, 4),
       ('akhdar', 'أخضر زيتي',    '#4a5b34', 15, 5),
       ('bejj',   'بيج رملي',     '#c9b294', 20, 6),
       ('azraq',  'أزرق سماوي',   '#4f86b8',  7, 7),
       ('khamri', 'خمري',         '#5c2233', 11, 8),
       ('asfar',  'أصفر خردلي',   '#c99a2e',  6, 9)
     ) as v(slug, name_ar, hex, stock, position)
where p.slug = 'tshirt-classic'
on conflict (product_id, slug) do update
  set color_name_ar = excluded.color_name_ar,
      color_hex     = excluded.color_hex,
      position      = excluded.position;

insert into public.product_sizes (product_id, label, stock, position)
select p.id, s.label, s.stock, s.position
from public.products p,
     (values ('S', 8, 0), ('M', 21, 1), ('L', 17, 2), ('XL', 10, 3), ('XXL', 0, 4))
       as s(label, stock, position)
where p.slug = 'tshirt-classic'
on conflict (product_id, label) do update
  set stock    = excluded.stock,
      position = excluded.position;
