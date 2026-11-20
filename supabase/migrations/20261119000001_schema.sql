-- =============================================================
-- Las Galletas de Tabo — esquema principal
-- Moneda: COP en enteros (sin decimales).
-- =============================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tipos ----------
create type public.app_role as enum ('admin', 'editor', 'customer');
create type public.order_status as enum ('pendiente','confirmado','en_preparacion','listo','enviado','entregado','cancelado');
create type public.payment_status as enum ('pendiente','en_proceso','aprobado','rechazado','cancelado','expirado','reembolsado');
create type public.payment_method as enum ('mercadopago_pse','transferencia','whatsapp');
create type public.stock_status as enum ('disponible','agotado','bajo_pedido');
create type public.product_kind as enum ('galleta_personalizada','alfajor','caja','estandar');

-- ---------- Utilidades ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- Perfiles y roles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  phone text not null default '',
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','editor'))
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- ---------- Biblioteca multimedia ----------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'media',
  path text not null unique,
  alt text not null default '',
  folder text not null default 'general',
  width int,
  height int,
  mime text,
  size_bytes int,
  blur_data text,
  is_stock boolean not null default false,
  source_name text,
  source_url text,
  author text,
  license text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index media_folder_idx on public.media(folder);
create trigger media_touch before update on public.media for each row execute function public.touch_updated_at();

-- ---------- Catálogo ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  image_id uuid references public.media(id) on delete set null,
  sort int not null default 0,
  is_active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger categories_touch before update on public.categories for each row execute function public.touch_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  short_description text not null default '',
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  kind public.product_kind not null default 'estandar',
  price int not null check (price >= 0),
  compare_at_price int check (compare_at_price is null or compare_at_price >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  stock_status public.stock_status not null default 'bajo_pedido',
  track_inventory boolean not null default false,
  stock_quantity int check (stock_quantity is null or stock_quantity >= 0),
  min_quantity int not null default 1 check (min_quantity >= 1),
  max_quantity int not null default 200 check (max_quantity >= 1),
  quantity_step int not null default 1 check (quantity_step >= 1),
  quantity_label text not null default 'unidades',
  prep_days_min int not null default 0 check (prep_days_min >= 0),
  prep_days_max int not null default 0 check (prep_days_max >= 0),
  prep_time_text text not null default '',
  customization_fields jsonb not null default '[]'::jsonb check (jsonb_typeof(customization_fields) = 'array'),
  tags text[] not null default '{}',
  seo_title text,
  seo_description text,
  is_sample boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_qty_range check (max_quantity >= min_quantity)
);
create index products_category_idx on public.products(category_id);
create index products_active_idx on public.products(is_active, sort);
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete restrict,
  sort int not null default 0,
  unique (product_id, media_id)
);
create index product_images_product_idx on public.product_images(product_id, sort);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  options jsonb not null default '{}'::jsonb check (jsonb_typeof(options) = 'object'),
  price int not null check (price >= 0),
  compare_at_price int check (compare_at_price is null or compare_at_price >= 0),
  sku text,
  is_active boolean not null default true,
  stock_quantity int check (stock_quantity is null or stock_quantity >= 0),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants(product_id, sort);
create trigger product_variants_touch before update on public.product_variants for each row execute function public.touch_updated_at();

-- ---------- Contenido del sitio (CMS) ----------
create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  admin_only boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger site_settings_touch before update on public.site_settings for each row execute function public.touch_updated_at();

create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page text not null default 'home',
  type text not null,
  label text not null default '',
  -- Versión publicada
  variant text not null default 'default',
  sort int not null default 0,
  is_enabled boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  -- Borrador: se previsualiza y luego se publica
  draft_variant text,
  draft_sort int,
  draft_enabled boolean,
  draft_content jsonb,
  published_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index page_sections_page_idx on public.page_sections(page, sort);
create trigger page_sections_touch before update on public.page_sections for each row execute function public.touch_updated_at();

-- ---------- Comercio ----------
create table public.delivery_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price int not null default 0 check (price >= 0),
  price_note text not null default '',
  requires_address boolean not null default true,
  is_active boolean not null default true,
  is_sample boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger delivery_methods_touch before update on public.delivery_methods for each row execute function public.touch_updated_at();

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
  description text not null default '',
  discount_type text not null check (discount_type in ('percent','fixed')),
  value int not null check (value > 0),
  min_subtotal int not null default 0 check (min_subtotal >= 0),
  max_uses int check (max_uses is null or max_uses > 0),
  used_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_percent_range check (discount_type <> 'percent' or value <= 100)
);
create trigger coupons_touch before update on public.coupons for each row execute function public.touch_updated_at();

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  phone text not null default '',
  user_id uuid references auth.users(id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_email_idx on public.customers (lower(email));
create trigger customers_touch before update on public.customers for each row execute function public.touch_updated_at();

create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('GT-' || nextval('public.order_number_seq')::text),
  public_token uuid not null unique default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  address text not null default '',
  city text not null default '',
  neighborhood text not null default '',
  desired_date date,
  delivery_method_id uuid references public.delivery_methods(id) on delete set null,
  delivery_method_name text not null,
  delivery_fee int not null default 0,
  notes text not null default '',
  subtotal int not null,
  discount int not null default 0,
  total int not null check (total >= 0),
  coupon_code text,
  status public.order_status not null default 'pendiente',
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pendiente',
  payer jsonb not null default '{}'::jsonb,
  stock_released boolean not null default false,
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_created_idx on public.orders(created_at desc);
create index orders_status_idx on public.orders(status);
create index orders_customer_idx on public.orders(customer_id);
create index orders_user_idx on public.orders(user_id);
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_name text,
  unit_price int not null,
  quantity int not null check (quantity > 0),
  line_total int not null,
  customization jsonb not null default '{}'::jsonb,
  reference_image_path text,
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items(order_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null default 'status' check (kind in ('status','payment','note')),
  from_value text,
  to_value text,
  note text not null default '',
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history(order_id, created_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'mercadopago',
  environment text not null default 'test' check (environment in ('test','production')),
  provider_order_id text unique,
  provider_payment_id text,
  idempotency_key uuid not null unique default gen_random_uuid(),
  status public.payment_status not null default 'pendiente',
  provider_status text,
  provider_status_detail text,
  amount int not null,
  redirect_url text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on public.payments(order_id);
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'mercadopago',
  dedupe_key text not null unique,
  topic text,
  action text,
  resource_id text,
  signature_valid boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received','processing','processed','ignored','rejected','error')),
  error text,
  attempts int not null default 1,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
create index webhook_events_received_idx on public.webhook_events(received_at desc);

create table public.activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_created_idx on public.activity_log(created_at desc);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  type text not null check (type in ('page_view','product_view','add_to_cart','checkout_start','order_created')),
  session_id text not null check (char_length(session_id) <= 64),
  path text check (char_length(path) <= 300),
  product_id uuid,
  created_at timestamptz not null default now()
);
create index analytics_events_created_idx on public.analytics_events(created_at desc, type);

-- ---------- Historial automático de estados ----------
create or replace function public.log_order_changes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history(order_id, kind, from_value, to_value, note)
    values (new.id, 'status', null, new.status::text, 'Pedido creado');
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.order_status_history(order_id, kind, from_value, to_value, changed_by)
    values (new.id, 'status', old.status::text, new.status::text, auth.uid());
  end if;
  if new.payment_status is distinct from old.payment_status then
    insert into public.order_status_history(order_id, kind, from_value, to_value, changed_by)
    values (new.id, 'payment', old.payment_status::text, new.payment_status::text, auth.uid());
  end if;
  return new;
end $$;
create trigger orders_history after insert or update on public.orders for each row execute function public.log_order_changes();

-- Devuelve el inventario al cancelar un pedido (una sola vez)
create or replace function public.release_stock_on_cancel() returns trigger
language plpgsql security definer set search_path = '' as $$
declare it record;
begin
  if new.status = 'cancelado' and old.status <> 'cancelado' and not old.stock_released then
    for it in select oi.product_id, oi.variant_id, oi.quantity from public.order_items oi where oi.order_id = new.id loop
      if it.variant_id is not null then
        update public.product_variants set stock_quantity = stock_quantity + it.quantity
          where id = it.variant_id and stock_quantity is not null;
      end if;
      update public.products p set stock_quantity = p.stock_quantity + it.quantity,
        stock_status = case when p.stock_status = 'agotado' then 'disponible'::public.stock_status else p.stock_status end
        where p.id = it.product_id and p.track_inventory and p.stock_quantity is not null;
    end loop;
    new.stock_released = true;
  end if;
  return new;
end $$;
create trigger orders_release_stock before update on public.orders for each row execute function public.release_stock_on_cancel();
