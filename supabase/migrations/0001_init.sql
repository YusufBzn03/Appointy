-- Appointy — initial schema (PostgreSQL / Supabase)
-- Roles: customer, salon_owner, admin. RLS is enabled on every table.
-- Admin rights are never self-service: they can only be granted with the service role.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role         as enum ('customer', 'salon_owner', 'admin');
create type public.salon_category    as enum ('barber', 'friseur', 'kosmetik', 'nagelstudio', 'spa');
create type public.salon_status      as enum ('pending', 'active', 'suspended');
create type public.appointment_status as enum ('confirmed', 'cancelled', 'completed', 'no_show');
create type public.notify_channel    as enum ('push', 'sms', 'email');
create type public.notify_status     as enum ('pending', 'sent', 'failed', 'skipped');
create type public.calendar_provider as enum ('google', 'outlook', 'email');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'customer',
  full_name   text,
  phone       text,
  locale      text not null default 'de' check (locale in ('de','en','tr','ar','fr','sr','ru')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER so policies can check the role without recursing into profiles' own RLS.
create or replace function public.current_role_name() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- Sign-up: only 'customer' and 'salon_owner' can be requested from the client.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare requested text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, role, full_name, phone, locale)
  values (
    new.id,
    case when requested = 'salon_owner' then 'salon_owner'::public.user_role else 'customer' end,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'de')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their profile but never their own role (service role / SQL editor may).
create or replace function public.profiles_guard_role() returns trigger
language plpgsql as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    raise exception 'role can only be changed by the service role';
  end if;
  return new;
end $$;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.profiles_guard_role();

-- ---------------------------------------------------------------------------
-- Treatments catalogue ("Behandlungen"): core ones always show in the filter,
-- non-core ones only once an active salon offers them (see available_treatments).
-- Labels live in the app's i18n dictionaries, keyed by `id`.
-- ---------------------------------------------------------------------------
create table public.treatments (
  id    text primary key,            -- haircut, coloring, perm, beard, nails, ...
  core  boolean not null default false,
  sort  int not null default 0
);
insert into public.treatments (id, core, sort) values
  ('haircut', true, 1), ('coloring', true, 2), ('perm', true, 3), ('beard', true, 4),
  ('nails', false, 5), ('pedicure', false, 6), ('facial', false, 7), ('waxing', false, 8),
  ('massage', false, 9), ('makeup', false, 10), ('lashes', false, 11);

-- ---------------------------------------------------------------------------
-- Salons
-- ---------------------------------------------------------------------------
create table public.salons (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references public.profiles (id) on delete restrict,
  name               text not null,
  slug               text not null unique,
  category           public.salon_category not null,
  description        text,
  street             text,
  postal_code        text not null,
  city               text not null,
  lat                double precision,
  lng                double precision,
  phone              text not null,
  phone_verified_at  timestamptz,
  website            text,
  photo_paths        text[] not null default '{}',   -- keys in the salon-photos bucket
  status             public.salon_status not null default 'pending',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index salons_owner_idx    on public.salons (owner_id);
create index salons_status_idx   on public.salons (status, category);
create index salons_postal_idx   on public.salons (postal_code);
create trigger salons_updated before update on public.salons
  for each row execute function public.set_updated_at();

-- Owners cannot approve themselves: status / owner changes are admin-only.
create or replace function public.salons_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' and not public.is_admin() then
    new.status := 'pending';
  elsif tg_op = 'UPDATE' and not public.is_admin() and auth.role() <> 'service_role' then
    if new.status is distinct from old.status or new.owner_id is distinct from old.owner_id then
      raise exception 'status and owner can only be changed by an admin';
    end if;
  end if;
  return new;
end $$;
create trigger salons_guard before insert or update on public.salons
  for each row execute function public.salons_guard();

create or replace function public.owns_salon(p_salon uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.salons where id = p_salon and owner_id = auth.uid())
$$;

create table public.salon_treatments (
  salon_id      uuid not null references public.salons (id) on delete cascade,
  treatment_id  text not null references public.treatments (id),
  duration_min  int  not null default 30 check (duration_min between 5 and 480),
  price_cents   int  check (price_cents >= 0),
  primary key (salon_id, treatment_id)
);

create table public.opening_hours (
  id        uuid primary key default gen_random_uuid(),
  salon_id  uuid not null references public.salons (id) on delete cascade,
  weekday   smallint not null check (weekday between 0 and 6),   -- 0 = Sunday
  opens_at  time not null,
  closes_at time not null,
  check (closes_at > opens_at)
);
create index opening_hours_salon_idx on public.opening_hours (salon_id, weekday);

-- ---------------------------------------------------------------------------
-- Staff & calendars
-- ---------------------------------------------------------------------------
create table public.staff (
  id         uuid primary key default gen_random_uuid(),
  salon_id   uuid not null references public.salons (id) on delete cascade,
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index staff_salon_idx on public.staff (salon_id);

create table public.staff_treatments (
  staff_id      uuid not null references public.staff (id) on delete cascade,
  salon_id      uuid not null,
  treatment_id  text not null,
  primary key (staff_id, treatment_id),
  foreign key (salon_id, treatment_id) references public.salon_treatments (salon_id, treatment_id) on delete cascade
);

-- External calendar link (Google / Outlook / business e-mail). Tokens are stored
-- encrypted by an Edge Function and are never exposed to clients (no select policy on token columns).
create table public.staff_calendars (
  id              uuid primary key default gen_random_uuid(),
  staff_id        uuid not null references public.staff (id) on delete cascade,
  salon_id        uuid not null references public.salons (id) on delete cascade,
  provider        public.calendar_provider not null,
  external_id     text,
  account_email   text,
  sync_token      text,
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now()
);
-- Token material lives in a separate table that only the service role can read.
create table public.calendar_secrets (
  calendar_id  uuid primary key references public.staff_calendars (id) on delete cascade,
  secret_enc   bytea not null
);

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------
create table public.appointments (
  id               uuid primary key default gen_random_uuid(),
  salon_id         uuid not null references public.salons (id) on delete cascade,
  staff_id         uuid not null references public.staff (id),
  treatment_id     text not null references public.treatments (id),
  customer_id      uuid references public.profiles (id) on delete set null,
  -- snapshot so the salon keeps contact data even if the account is deleted
  customer_name    text not null,
  customer_phone   text not null,
  customer_email   text,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  status           public.appointment_status not null default 'confirmed',
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (ends_at > starts_at),
  -- no double-booking of one staff member
  constraint appointments_no_overlap exclude using gist (
    staff_id with =, tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmed')
);
create index appointments_salon_time_idx on public.appointments (salon_id, starts_at);
create index appointments_customer_idx   on public.appointments (customer_id, starts_at desc);
create trigger appointments_updated before update on public.appointments
  for each row execute function public.set_updated_at();

-- Customers may only cancel their own appointment, nothing else.
create or replace function public.appointments_guard() returns trigger
language plpgsql as $$
begin
  if public.is_admin() or auth.role() = 'service_role' or public.owns_salon(old.salon_id) then
    return new;
  end if;
  if (new.salon_id, new.staff_id, new.treatment_id, new.customer_id, new.starts_at, new.ends_at,
      new.customer_name, new.customer_phone)
     is distinct from
     (old.salon_id, old.staff_id, old.treatment_id, old.customer_id, old.starts_at, old.ends_at,
      old.customer_name, old.customer_phone)
     or new.status not in (old.status, 'cancelled') then
    raise exception 'customers can only cancel their appointment';
  end if;
  return new;
end $$;
create trigger appointments_guard before update on public.appointments
  for each row execute function public.appointments_guard();

-- Public availability without leaking customer data: only busy time ranges.
create or replace function public.busy_slots(p_salon uuid, p_from timestamptz, p_to timestamptz)
returns table (staff_id uuid, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.staff_id, a.starts_at, a.ends_at
  from public.appointments a
  join public.salons s on s.id = a.salon_id and s.status = 'active'
  where a.salon_id = p_salon and a.status = 'confirmed'
    and a.starts_at < p_to and a.ends_at > p_from
$$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table public.notification_settings (
  salon_id       uuid primary key references public.salons (id) on delete cascade,
  push_enabled   boolean not null default true,
  sms_enabled    boolean not null default true,
  email_enabled  boolean not null default true,
  sms_phone      text,          -- defaults to salons.phone when null
  notify_email   text,
  updated_at     timestamptz not null default now()
);
create trigger notification_settings_updated before update on public.notification_settings
  for each row execute function public.set_updated_at();

create table public.push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  token      text not null unique,                      -- Expo push token / FCM token
  platform   text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

create table public.notification_log (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid not null references public.salons (id) on delete cascade,
  appointment_id  uuid references public.appointments (id) on delete set null,
  channel         public.notify_channel not null,
  recipient       text not null,
  payload         text not null,
  status          public.notify_status not null default 'pending',
  provider_id     text,
  error           text,
  cost_micro_eur  int not null default 0,                -- 1 000 000 = 1 €
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);
create index notification_log_salon_idx  on public.notification_log (salon_id, created_at desc);
create index notification_log_status_idx on public.notification_log (status, channel);

-- Payload: "Neuer Termin! [Datum & Uhrzeit] | [Behandlung] | Kunde: [Name] | Tel: [Telefon]"
-- Fixed-format business text; deliberately not translated (see CLAUDE.md).
create or replace function public.format_booking_payload(p_appointment uuid) returns text
language sql stable security definer set search_path = public as $$
  select 'Neuer Termin! ' || to_char(a.starts_at at time zone 'Europe/Berlin', 'DD.MM.YYYY HH24:MI')
         || ' Uhr | ' || a.treatment_id
         || ' | Kunde: ' || a.customer_name || ' | Tel: ' || a.customer_phone
  from public.appointments a where a.id = p_appointment
$$;

-- On every new booking, queue one log row per enabled channel. A Supabase Database
-- Webhook on notification_log INSERT calls the `dispatch-notification` Edge Function,
-- which talks to Expo Push / Twilio / Resend and updates status, provider_id and cost.
create or replace function public.queue_booking_notifications() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s public.notification_settings;
  salon public.salons;
  payload text := public.format_booking_payload(new.id);
begin
  select * into salon from public.salons where id = new.salon_id;
  select * into s from public.notification_settings where salon_id = new.salon_id;
  if not found then
    s.push_enabled := true; s.sms_enabled := true; s.email_enabled := true;
  end if;

  if s.push_enabled then
    insert into public.notification_log (salon_id, appointment_id, channel, recipient, payload)
    select new.salon_id, new.id, 'push', t.token, payload
    from public.push_tokens t where t.user_id = salon.owner_id;
  end if;
  if s.sms_enabled then
    insert into public.notification_log (salon_id, appointment_id, channel, recipient, payload)
    values (new.salon_id, new.id, 'sms', coalesce(s.sms_phone, salon.phone), payload);
  end if;
  if s.email_enabled then
    insert into public.notification_log (salon_id, appointment_id, channel, recipient, payload)
    values (new.salon_id, new.id, 'email',
            coalesce(s.notify_email, (select email from auth.users where id = salon.owner_id)), payload);
    if new.customer_email is not null then
      insert into public.notification_log (salon_id, appointment_id, channel, recipient, payload)
      values (new.salon_id, new.id, 'email', new.customer_email, payload);
    end if;
  end if;
  return new;
end $$;
create trigger appointments_notify after insert on public.appointments
  for each row execute function public.queue_booking_notifications();

-- ---------------------------------------------------------------------------
-- Search helpers (public)
-- ---------------------------------------------------------------------------
-- Treatment filter: core treatments always, niche ones only if an active salon offers them.
create or replace view public.available_treatments with (security_invoker = false) as
  select t.id, t.core, t.sort
  from public.treatments t
  where t.core or exists (
    select 1 from public.salon_treatments st
    join public.salons s on s.id = st.salon_id and s.status = 'active'
    where st.treatment_id = t.id
  );
grant select on public.available_treatments to anon, authenticated;

create or replace function public.salons_nearby(
  p_lat double precision, p_lng double precision, p_radius_km double precision default 20,
  p_category public.salon_category default null, p_treatment text default null
) returns table (id uuid, name text, slug text, category public.salon_category, city text, distance_km double precision)
language sql stable security definer set search_path = public as $$
  select * from (
    select s.id, s.name, s.slug, s.category, s.city,
           6371 * 2 * asin(sqrt(
             power(sin(radians(s.lat - p_lat) / 2), 2) +
             cos(radians(p_lat)) * cos(radians(s.lat)) * power(sin(radians(s.lng - p_lng) / 2), 2)
           )) as distance_km
    from public.salons s
    where s.status = 'active' and s.lat is not null and s.lng is not null
      and (p_category is null or s.category = p_category)
      and (p_treatment is null or exists (
        select 1 from public.salon_treatments st where st.salon_id = s.id and st.treatment_id = p_treatment))
  ) q where q.distance_km <= p_radius_km order by q.distance_km
$$;

-- ---------------------------------------------------------------------------
-- Admin dashboard metrics (admin-only; SECURITY DEFINER with an explicit check)
-- ---------------------------------------------------------------------------
create or replace function public.admin_platform_stats(p_from timestamptz default date_trunc('month', now()))
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return jsonb_build_object(
    'total_bookings', (select count(*) from public.appointments),
    'bookings_in_period', (select count(*) from public.appointments where created_at >= p_from),
    'active_salons', (select count(*) from public.salons where status = 'active'),
    'pending_salons', (select count(*) from public.salons where status = 'pending'),
    'push_sent', (select count(*) from public.notification_log where channel = 'push' and status = 'sent' and created_at >= p_from),
    'sms_sent', (select count(*) from public.notification_log where channel = 'sms' and status = 'sent' and created_at >= p_from),
    'email_sent', (select count(*) from public.notification_log where channel = 'email' and status = 'sent' and created_at >= p_from),
    'dispatch_cost_eur', (select coalesce(sum(cost_micro_eur), 0) / 1000000.0 from public.notification_log where created_at >= p_from)
  );
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.treatments            enable row level security;
alter table public.salons                enable row level security;
alter table public.salon_treatments      enable row level security;
alter table public.opening_hours         enable row level security;
alter table public.staff                 enable row level security;
alter table public.staff_treatments      enable row level security;
alter table public.staff_calendars       enable row level security;
alter table public.calendar_secrets      enable row level security;   -- no policies: service role only
alter table public.appointments          enable row level security;
alter table public.notification_settings enable row level security;
alter table public.push_tokens           enable row level security;
alter table public.notification_log      enable row level security;

-- profiles
create policy profiles_self_read   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all   on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- treatments catalogue: public read, admin write
create policy treatments_read  on public.treatments for select using (true);
create policy treatments_admin on public.treatments for all using (public.is_admin()) with check (public.is_admin());

-- salons: active ones are public; owners see/manage their own; admins everything
create policy salons_public_read  on public.salons for select using (status = 'active');
create policy salons_owner_read   on public.salons for select using (owner_id = auth.uid());
create policy salons_owner_insert on public.salons for insert
  with check (owner_id = auth.uid() and public.current_role_name() = 'salon_owner');
create policy salons_owner_update on public.salons for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy salons_admin_all    on public.salons for all using (public.is_admin()) with check (public.is_admin());

-- salon child tables: public read for active salons, owner write, admin all
create policy salon_treatments_read on public.salon_treatments for select
  using (exists (select 1 from public.salons s where s.id = salon_id and s.status = 'active') or public.owns_salon(salon_id));
create policy salon_treatments_owner on public.salon_treatments for all
  using (public.owns_salon(salon_id)) with check (public.owns_salon(salon_id));
create policy salon_treatments_admin on public.salon_treatments for all using (public.is_admin()) with check (public.is_admin());

create policy opening_hours_read on public.opening_hours for select
  using (exists (select 1 from public.salons s where s.id = salon_id and s.status = 'active') or public.owns_salon(salon_id));
create policy opening_hours_owner on public.opening_hours for all
  using (public.owns_salon(salon_id)) with check (public.owns_salon(salon_id));
create policy opening_hours_admin on public.opening_hours for all using (public.is_admin()) with check (public.is_admin());

create policy staff_read on public.staff for select
  using (exists (select 1 from public.salons s where s.id = salon_id and s.status = 'active') or public.owns_salon(salon_id));
create policy staff_owner on public.staff for all
  using (public.owns_salon(salon_id)) with check (public.owns_salon(salon_id));
create policy staff_admin on public.staff for all using (public.is_admin()) with check (public.is_admin());

create policy staff_treatments_read on public.staff_treatments for select
  using (exists (select 1 from public.salons s where s.id = salon_id and s.status = 'active') or public.owns_salon(salon_id));
create policy staff_treatments_owner on public.staff_treatments for all
  using (public.owns_salon(salon_id)) with check (public.owns_salon(salon_id));
create policy staff_treatments_admin on public.staff_treatments for all using (public.is_admin()) with check (public.is_admin());

-- calendars: owner + admin only
create policy staff_calendars_owner on public.staff_calendars for all
  using (public.owns_salon(salon_id)) with check (public.owns_salon(salon_id));
create policy staff_calendars_admin on public.staff_calendars for select using (public.is_admin());

-- appointments
create policy appointments_customer_read on public.appointments for select using (customer_id = auth.uid());
create policy appointments_owner_read    on public.appointments for select using (public.owns_salon(salon_id));
create policy appointments_admin_read    on public.appointments for select using (public.is_admin());
create policy appointments_customer_insert on public.appointments for insert
  with check (
    customer_id = auth.uid()
    and status = 'confirmed'
    and exists (select 1 from public.salons s where s.id = salon_id and s.status = 'active')
    and exists (select 1 from public.staff st where st.id = staff_id and st.salon_id = appointments.salon_id and st.active)
  );
create policy appointments_owner_insert on public.appointments for insert with check (public.owns_salon(salon_id));
create policy appointments_customer_update on public.appointments for update
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());   -- narrowed to "cancel" by appointments_guard
create policy appointments_owner_update on public.appointments for update
  using (public.owns_salon(salon_id)) with check (public.owns_salon(salon_id));
create policy appointments_admin_update on public.appointments for update using (public.is_admin()) with check (public.is_admin());

-- notification settings / push tokens / log
create policy notification_settings_owner on public.notification_settings for all
  using (public.owns_salon(salon_id)) with check (public.owns_salon(salon_id));
create policy notification_settings_admin on public.notification_settings for select using (public.is_admin());

create policy push_tokens_self  on public.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_tokens_admin on public.push_tokens for select using (public.is_admin());

create policy notification_log_owner on public.notification_log for select using (public.owns_salon(salon_id));
create policy notification_log_admin on public.notification_log for select using (public.is_admin());
-- inserts/updates on notification_log happen only via the SECURITY DEFINER trigger and the service role.

-- ---------------------------------------------------------------------------
-- Storage: public-read bucket for salon photos, owners write inside "<salon_id>/".
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('salon-photos', 'salon-photos', true)
  on conflict (id) do nothing;

create policy salon_photos_public_read on storage.objects for select using (bucket_id = 'salon-photos');
create policy salon_photos_owner_write on storage.objects for insert to authenticated
  with check (bucket_id = 'salon-photos' and public.owns_salon(((storage.foldername(name))[1])::uuid));
create policy salon_photos_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'salon-photos' and public.owns_salon(((storage.foldername(name))[1])::uuid));
create policy salon_photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'salon-photos' and public.owns_salon(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------------
-- Grants: RLS does the real gatekeeping; make sure anon can browse the public catalogue.
-- ---------------------------------------------------------------------------
grant execute on function public.busy_slots(uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.salons_nearby(double precision, double precision, double precision, public.salon_category, text) to anon, authenticated;
grant execute on function public.admin_platform_stats(timestamptz) to authenticated;
