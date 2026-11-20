-- Mensajes del formulario de contacto (visibles en el CRM)
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 200),
  phone text not null default '' check (char_length(phone) <= 40),
  message text not null check (char_length(message) between 5 and 4000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index contact_messages_created_idx on public.contact_messages(created_at desc);
alter table public.contact_messages enable row level security;
create policy contact_staff_read on public.contact_messages for select to authenticated using (public.is_staff());
create policy contact_staff_update on public.contact_messages for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy contact_staff_delete on public.contact_messages for delete to authenticated using (public.is_staff());
grant select, update, delete on public.contact_messages to authenticated;
grant all on public.contact_messages to service_role;
