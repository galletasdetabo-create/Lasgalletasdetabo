-- =============================================================
-- Funciones de negocio, RLS, permisos y almacenamiento
-- =============================================================

-- ---------- Cupones ----------
-- Devuelve el descuento aplicable; nunca confía en importes del cliente.
create or replace function public.coupon_discount(p_code text, p_subtotal int)
returns table (coupon_id uuid, code text, discount int, error text)
language plpgsql stable security definer set search_path = '' as $$
declare c public.coupons%rowtype; d int;
begin
  if p_code is null or btrim(p_code) = '' then
    return query select null::uuid, null::text, 0, null::text; return;
  end if;
  select * into c from public.coupons where public.coupons.code = upper(btrim(p_code));
  if not found or not c.is_active then
    return query select null::uuid, null::text, 0, 'El cupón no existe o no está activo.'; return;
  end if;
  if c.starts_at is not null and now() < c.starts_at then
    return query select null::uuid, null::text, 0, 'El cupón todavía no está vigente.'; return;
  end if;
  if c.ends_at is not null and now() > c.ends_at then
    return query select null::uuid, null::text, 0, 'El cupón ya venció.'; return;
  end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then
    return query select null::uuid, null::text, 0, 'El cupón alcanzó su límite de usos.'; return;
  end if;
  if p_subtotal < c.min_subtotal then
    return query select null::uuid, null::text, 0, format('El cupón requiere un subtotal mínimo de $%s.', to_char(c.min_subtotal, 'FM999G999G999')); return;
  end if;
  if c.discount_type = 'percent' then d := floor(p_subtotal * c.value / 100.0);
  else d := least(c.value, p_subtotal); end if;
  return query select c.id, c.code, d, null::text;
end $$;

-- ---------- Creación atómica de pedidos ----------
-- Recalcula precios, valida disponibilidad, aplica cupón y descuenta inventario
-- en una sola transacción. Solo la invoca el servidor (service_role).
create or replace function public.create_order(p jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'America/Bogota')::date;
  v_dm public.delivery_methods%rowtype;
  v_item jsonb;
  v_prod public.products%rowtype;
  v_var public.product_variants%rowtype;
  v_has_variants boolean;
  v_qty int;
  v_unit int;
  v_subtotal int := 0;
  v_lead int := 0;
  v_lines jsonb := '[]'::jsonb;
  v_coupon record;
  v_discount int := 0;
  v_total int;
  v_customer_id uuid;
  v_order public.orders%rowtype;
  v_email text := lower(btrim(p->'customer'->>'email'));
  v_desired date := nullif(p->>'desired_date','')::date;
  v_line jsonb;
begin
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 then
    raise exception 'EMPTY_CART' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p->'items') > 50 then
    raise exception 'TOO_MANY_ITEMS' using errcode = 'P0001';
  end if;

  select * into v_dm from public.delivery_methods where id = (p->>'delivery_method_id')::uuid and is_active;
  if not found then raise exception 'INVALID_DELIVERY_METHOD' using errcode = 'P0001'; end if;
  if v_dm.requires_address and coalesce(btrim(p->>'address'),'') = '' then
    raise exception 'ADDRESS_REQUIRED' using errcode = 'P0001';
  end if;

  for v_item in select * from jsonb_array_elements(p->'items') loop
    select * into v_prod from public.products where id = (v_item->>'product_id')::uuid for update;
    if not found or not v_prod.is_active then
      raise exception 'PRODUCT_UNAVAILABLE:%', coalesce(v_item->>'product_id','') using errcode = 'P0001';
    end if;
    if v_prod.stock_status = 'agotado' then
      raise exception 'PRODUCT_SOLD_OUT:%', v_prod.name using errcode = 'P0001';
    end if;

    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < v_prod.min_quantity or v_qty > v_prod.max_quantity
       or (v_qty - v_prod.min_quantity) % v_prod.quantity_step <> 0 then
      raise exception 'INVALID_QUANTITY:%', v_prod.name using errcode = 'P0001';
    end if;

    select exists(select 1 from public.product_variants where product_id = v_prod.id and is_active) into v_has_variants;
    v_var := null;
    if v_has_variants then
      select * into v_var from public.product_variants
        where id = nullif(v_item->>'variant_id','')::uuid and product_id = v_prod.id and is_active for update;
      if not found then raise exception 'VARIANT_REQUIRED:%', v_prod.name using errcode = 'P0001'; end if;
      v_unit := v_var.price;
      if v_var.stock_quantity is not null then
        if v_var.stock_quantity < v_qty then raise exception 'INSUFFICIENT_STOCK:%', v_prod.name using errcode = 'P0001'; end if;
        update public.product_variants set stock_quantity = stock_quantity - v_qty where id = v_var.id;
      end if;
    else
      v_unit := v_prod.price;
    end if;

    if v_prod.track_inventory and v_prod.stock_quantity is not null then
      if v_prod.stock_quantity < v_qty then raise exception 'INSUFFICIENT_STOCK:%', v_prod.name using errcode = 'P0001'; end if;
      update public.products set stock_quantity = stock_quantity - v_qty,
        stock_status = case when stock_quantity - v_qty <= 0 then 'agotado'::public.stock_status else stock_status end
        where id = v_prod.id;
    end if;

    if length(coalesce(v_item->'customization','{}'::jsonb)::text) > 6000 then
      raise exception 'CUSTOMIZATION_TOO_LARGE' using errcode = 'P0001';
    end if;

    v_lead := greatest(v_lead, v_prod.prep_days_min);
    v_subtotal := v_subtotal + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_prod.id, 'variant_id', v_var.id, 'product_name', v_prod.name,
      'variant_name', v_var.name, 'unit_price', v_unit, 'quantity', v_qty,
      'line_total', v_unit * v_qty,
      'customization', coalesce(v_item->'customization','{}'::jsonb),
      'reference_image_path', nullif(v_item->>'reference_image_path',''));
  end loop;

  if v_desired is not null and v_desired < v_today + v_lead then
    raise exception 'DATE_TOO_SOON:%', (v_today + v_lead)::text using errcode = 'P0001';
  end if;

  select * into v_coupon from public.coupon_discount(p->>'coupon_code', v_subtotal);
  if v_coupon.error is not null then
    raise exception 'COUPON:%', v_coupon.error using errcode = 'P0001';
  end if;
  v_discount := coalesce(v_coupon.discount, 0);
  if v_coupon.coupon_id is not null then
    update public.coupons set used_count = used_count + 1 where id = v_coupon.coupon_id;
  end if;

  v_total := greatest(v_subtotal - v_discount, 0) + v_dm.price;

  insert into public.customers (email, full_name, phone, user_id)
  values (v_email, btrim(p->'customer'->>'name'), btrim(p->'customer'->>'phone'), nullif(p->>'user_id','')::uuid)
  on conflict (lower(email)) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    user_id = coalesce(public.customers.user_id, excluded.user_id)
  returning id into v_customer_id;

  insert into public.orders (
    customer_id, user_id, customer_name, customer_email, customer_phone,
    address, city, neighborhood, desired_date,
    delivery_method_id, delivery_method_name, delivery_fee, notes,
    subtotal, discount, total, coupon_code, payment_method, payer)
  values (
    v_customer_id, nullif(p->>'user_id','')::uuid, btrim(p->'customer'->>'name'), v_email, btrim(p->'customer'->>'phone'),
    coalesce(btrim(p->>'address'),''), coalesce(btrim(p->>'city'),''), coalesce(btrim(p->>'neighborhood'),''), v_desired,
    v_dm.id, v_dm.name, v_dm.price, coalesce(btrim(p->>'notes'),''),
    v_subtotal, v_discount, v_total, v_coupon.code, (p->>'payment_method')::public.payment_method,
    coalesce(p->'payer','{}'::jsonb))
  returning * into v_order;

  for v_line in select * from jsonb_array_elements(v_lines) loop
    insert into public.order_items (order_id, product_id, variant_id, product_name, variant_name,
      unit_price, quantity, line_total, customization, reference_image_path)
    values (v_order.id, (v_line->>'product_id')::uuid, nullif(v_line->>'variant_id','')::uuid,
      v_line->>'product_name', v_line->>'variant_name', (v_line->>'unit_price')::int,
      (v_line->>'quantity')::int, (v_line->>'line_total')::int, v_line->'customization',
      v_line->>'reference_image_path');
  end loop;

  return jsonb_build_object('id', v_order.id, 'number', v_order.number,
    'public_token', v_order.public_token, 'total', v_order.total,
    'subtotal', v_subtotal, 'discount', v_discount, 'delivery_fee', v_dm.price);
end $$;

-- ---------- Indicadores del panel ----------
create or replace function public.dashboard_stats(p_days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; v_from timestamptz := now() - make_interval(days => greatest(p_days,1));
begin
  if not public.is_staff() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select jsonb_build_object(
    'sales_paid', coalesce((select sum(total) from public.orders where created_at >= v_from and payment_status = 'aprobado'), 0),
    'sales_all', coalesce((select sum(total) from public.orders where created_at >= v_from and status <> 'cancelado'), 0),
    'orders_count', (select count(*) from public.orders where created_at >= v_from),
    'orders_pending', (select count(*) from public.orders where status = 'pendiente'),
    'orders_in_progress', (select count(*) from public.orders where status in ('confirmado','en_preparacion','listo','enviado')),
    'avg_ticket', coalesce((select round(avg(total)) from public.orders where created_at >= v_from and status <> 'cancelado'), 0),
    'products_active', (select count(*) from public.products where is_active),
    'products_sold_out', (select count(*) from public.products where is_active and stock_status = 'agotado'),
    'customers', (select count(*) from public.customers),
    'customers_new', (select count(*) from public.customers where created_at >= v_from),
    'sessions', (select count(distinct session_id) from public.analytics_events where created_at >= v_from),
    'product_views', (select count(*) from public.analytics_events where created_at >= v_from and type = 'product_view'),
    'add_to_cart', (select count(*) from public.analytics_events where created_at >= v_from and type = 'add_to_cart'),
    'checkout_starts', (select count(distinct session_id) from public.analytics_events where created_at >= v_from and type = 'checkout_start'),
    'orders_from_sessions', (select count(distinct session_id) from public.analytics_events where created_at >= v_from and type = 'order_created'),
    'by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.orders group by status) s), '{}'::jsonb),
    'sales_by_day', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'total', t, 'orders', n) order by d) from (
        select (created_at at time zone 'America/Bogota')::date d, sum(total) t, count(*) n
        from public.orders where created_at >= v_from and status <> 'cancelado' group by 1) x), '[]'::jsonb),
    'top_products', coalesce((select jsonb_agg(x) from (
        select oi.product_name as name, sum(oi.quantity) as qty, sum(oi.line_total) as total
        from public.order_items oi join public.orders o on o.id = oi.order_id
        where o.created_at >= v_from and o.status <> 'cancelado'
        group by oi.product_name order by sum(oi.line_total) desc limit 5) x), '[]'::jsonb)
  ) into r;
  return r;
end $$;

-- ---------- Uso de medios (evita borrados accidentales) ----------
create or replace function public.media_usage(p_media_id uuid)
returns table (kind text, ref_id text, label text)
language sql stable security definer set search_path = '' as $$
  select 'producto', p.id::text, p.name from public.product_images pi join public.products p on p.id = pi.product_id where pi.media_id = p_media_id
  union all
  select 'categoría', c.id::text, c.name from public.categories c where c.image_id = p_media_id
  union all
  select 'sección', s.id::text, coalesce(nullif(s.label,''), s.type) || ' (' || s.page || ')' from public.page_sections s
    where s.content::text like '%' || p_media_id::text || '%' or coalesce(s.draft_content::text,'') like '%' || p_media_id::text || '%'
  union all
  select 'ajuste', st.key, st.key from public.site_settings st where st.value::text like '%' || p_media_id::text || '%'
$$;

create or replace function public.media_usage_counts()
returns table (media_id uuid, uses bigint)
language sql stable security definer set search_path = '' as $$
  select m.id, (
    (select count(*) from public.product_images pi where pi.media_id = m.id) +
    (select count(*) from public.categories c where c.image_id = m.id) +
    (select count(*) from public.page_sections s where s.content::text like '%' || m.id::text || '%' or coalesce(s.draft_content::text,'') like '%' || m.id::text || '%') +
    (select count(*) from public.site_settings st where st.value::text like '%' || m.id::text || '%')
  ) from public.media m
$$;

-- Publica todos los borradores de una página de forma atómica
create or replace function public.publish_page(p_page text)
returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.page_sections set
    content = coalesce(draft_content, content),
    variant = coalesce(draft_variant, variant),
    sort = coalesce(draft_sort, sort),
    is_enabled = coalesce(draft_enabled, is_enabled),
    draft_content = null, draft_variant = null, draft_sort = null, draft_enabled = null,
    published_at = now(), updated_by = auth.uid()
  where page = p_page and (draft_content is not null or draft_variant is not null or draft_sort is not null or draft_enabled is not null);
  get diagnostics n = row_count;
  return n;
end $$;

-- =============================================================
-- Seguridad: RLS
-- =============================================================
alter table public.profiles enable row level security;
alter table public.media enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.site_settings enable row level security;
alter table public.page_sections enable row level security;
alter table public.delivery_methods enable row level security;
alter table public.coupons enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.activity_log enable row level security;
alter table public.analytics_events enable row level security;

-- Perfiles
create policy profiles_self_read on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_staff());
create policy profiles_self_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_admin_update on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Catálogo: lectura pública de lo activo, escritura del equipo
create policy media_read on public.media for select to anon, authenticated using (true);
create policy media_staff_write on public.media for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy categories_read on public.categories for select to anon, authenticated using (is_active or public.is_staff());
create policy categories_staff_write on public.categories for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy products_read on public.products for select to anon, authenticated using (is_active or public.is_staff());
create policy products_staff_write on public.products for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy product_images_read on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_staff())));
create policy product_images_staff_write on public.product_images for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy product_variants_read on public.product_variants for select to anon, authenticated
  using ((is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active)) or public.is_staff());
create policy product_variants_staff_write on public.product_variants for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Ajustes: lectura pública solo de claves públicas; ajustes sensibles solo administradores
create policy settings_read on public.site_settings for select to anon, authenticated using (is_public or public.is_staff());
create policy settings_staff_write on public.site_settings for update to authenticated
  using (public.is_admin() or (public.is_staff() and not admin_only))
  with check (public.is_admin() or (public.is_staff() and not admin_only));
create policy settings_admin_insert on public.site_settings for insert to authenticated with check (public.is_admin());

-- Secciones: el público solo ve lo publicado (los borradores se ocultan por columnas)
create policy sections_read on public.page_sections for select to anon, authenticated using (is_enabled or public.is_staff());
create policy sections_staff_write on public.page_sections for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy delivery_read on public.delivery_methods for select to anon, authenticated using (is_active or public.is_staff());
create policy delivery_admin_write on public.delivery_methods for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy coupons_staff_read on public.coupons for select to authenticated using (public.is_staff());
create policy coupons_admin_write on public.coupons for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Clientes y pedidos
create policy customers_staff on public.customers for select to authenticated using (public.is_staff());
create policy customers_staff_update on public.customers for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy orders_read on public.orders for select to authenticated using (public.is_staff() or user_id = (select auth.uid()));
create policy orders_staff_update on public.orders for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy order_items_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (public.is_staff() or o.user_id = (select auth.uid()))));

create policy order_history_read on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (public.is_staff() or o.user_id = (select auth.uid()))));
create policy order_history_staff_insert on public.order_status_history for insert to authenticated with check (public.is_staff());

create policy payments_staff_read on public.payments for select to authenticated using (public.is_staff());
create policy webhook_admin_read on public.webhook_events for select to authenticated using (public.is_admin());
create policy activity_staff_read on public.activity_log for select to authenticated using (public.is_staff());
create policy analytics_staff_read on public.analytics_events for select to authenticated using (public.is_staff());

-- =============================================================
-- Permisos explícitos (principio de mínimo privilegio)
-- =============================================================
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.media, public.categories, public.products, public.product_images,
  public.product_variants, public.site_settings, public.delivery_methods to anon, authenticated;
-- El público no puede leer columnas de borrador
grant select (id, page, type, label, variant, sort, is_enabled, content, published_at) on public.page_sections to anon;
grant select on public.page_sections to authenticated;

grant insert, update, delete on public.media, public.categories, public.products, public.product_images,
  public.product_variants, public.page_sections, public.delivery_methods, public.coupons to authenticated;
grant update on public.site_settings to authenticated;
grant insert on public.site_settings to authenticated;
grant select on public.coupons, public.customers, public.orders, public.order_items,
  public.order_status_history, public.payments, public.webhook_events, public.activity_log,
  public.analytics_events to authenticated;
grant update on public.customers to authenticated;
grant update (status, admin_notes) on public.orders to authenticated;
grant insert on public.order_status_history to authenticated;
grant select on public.profiles to authenticated;
-- Un usuario solo puede cambiar su nombre y teléfono; el rol lo cambia un administrador vía servidor
grant update (full_name, phone) on public.profiles to authenticated;

grant execute on function public.is_staff(), public.is_admin() to anon, authenticated;
grant execute on function public.dashboard_stats(int), public.media_usage(uuid),
  public.media_usage_counts(), public.publish_page(text) to authenticated;
grant execute on function public.coupon_discount(text, int), public.create_order(jsonb) to service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- =============================================================
-- Almacenamiento
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml','image/x-icon','image/vnd.microsoft.icon']),
  ('order-references', 'order-references', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy media_bucket_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_staff());
create policy media_bucket_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_staff()) with check (bucket_id = 'media' and public.is_staff());
create policy media_bucket_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_staff());
create policy references_staff_read on storage.objects for select to authenticated
  using (bucket_id = 'order-references' and public.is_staff());
