-- ═══════════════════════════════════════════════════════════════
-- تحويل حالة الطلب مع ضبط المخزون
--
-- المشكلة التي يعالجها: `update orders set status = 'cancelled'` كان يترك
-- بضاعة الطلب الملغى محجوزة إلى الأبد كمخزون «مباع» وهمي. مع تراكم
-- الإلغاءات ينزلق المعروض إلى الصفر ويتوقّف البيع والمخزن ممتلئ.
--
-- الإلغاء يُعيد الكمية، والتراجع عن الإلغاء يخصمها من جديد — والاثنان في
-- معاملة واحدة مع تغيير الحالة، فلا حالة وسطى.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.set_order_status(
  p_order_id uuid,
  p_status   public.order_status
)
returns public.order_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.order_status;
  v_item    record;
begin
  -- الدالة تتخطّى سياسات الصفوف، فالتحقّق من الصلاحية مسؤوليتها هي
  if not public.is_admin() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;

  -- القفل يمنع تحويلين متزامنين من مضاعفة الإرجاع أو الخصم
  select status into v_current
    from public.orders
   where id = p_order_id
     for update;

  if not found then
    raise exception 'طلب غير معروف' using errcode = 'P0002';
  end if;

  if v_current = p_status then
    return v_current;
  end if;

  -- الدخول إلى «ملغى»: تعود البضاعة إلى الرف
  if p_status = 'cancelled' and v_current <> 'cancelled' then
    for v_item in
      select variant_id, quantity from public.order_items where order_id = p_order_id
    loop
      update public.product_variants
         set stock = stock + v_item.quantity
       where id = v_item.variant_id;
    end loop;
  end if;

  -- الخروج من «ملغى»: تُحجز من جديد، وترفض العملية كلها إن لم تعد متوفّرة
  if v_current = 'cancelled' and p_status <> 'cancelled' then
    for v_item in
      select variant_id, quantity from public.order_items where order_id = p_order_id
    loop
      update public.product_variants
         set stock = stock - v_item.quantity
       where id = v_item.variant_id
         and stock >= v_item.quantity;

      if not found then
        raise exception 'لا يمكن إعادة تفعيل الطلب: المخزون لم يعد كافياً'
          using errcode = 'P0001';
      end if;
    end loop;
  end if;

  update public.orders set status = p_status where id = p_order_id;
  return p_status;
end;
$$;

revoke all on function public.set_order_status(uuid, public.order_status) from anon;
grant execute on function public.set_order_status(uuid, public.order_status) to authenticated;
