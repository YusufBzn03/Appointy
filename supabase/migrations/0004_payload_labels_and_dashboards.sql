-- Appointy — readable treatment names in the SMS/push/email payload + dashboard aggregates.

-- ---------------------------------------------------------------------------
-- Payload labels. The payload is fixed-format German business text (see CLAUDE.md), so it uses
-- the German label regardless of UI language. Keep in sync with src/lib/i18n/dictionaries/de.ts.
-- ---------------------------------------------------------------------------
alter table public.treatments add column if not exists label_de text;

update public.treatments t set label_de = v.label
from (values
  ('haircut',  'Haare schneiden & Stylen'),
  ('coloring', 'Färben & Highlights'),
  ('perm',     'Locken & Umformung'),
  ('beard',    'Bartpflege'),
  ('nails',    'Fingernägel / Maniküre'),
  ('pedicure', 'Pediküre'),
  ('facial',   'Gesichtsbehandlung'),
  ('waxing',   'Epilation / Waxing'),
  ('massage',  'Massage & Spa'),
  ('makeup',   'Make-up'),
  ('lashes',   'Wimpern & Brows')
) as v(id, label)
where t.id = v.id;

-- "Neuer Termin! 01.01.2030 11:00 Uhr | Haare schneiden & Stylen | Kunde: Cleo Kunde | Tel: +49 151 111"
create or replace function public.format_booking_payload(p_appointment uuid) returns text
language sql stable security definer set search_path = public as $$
  select 'Neuer Termin! ' || to_char(a.starts_at at time zone 'Europe/Berlin', 'DD.MM.YYYY HH24:MI')
         || ' Uhr | ' || coalesce(t.label_de, a.treatment_id)
         || ' | Kunde: ' || a.customer_name || ' | Tel: ' || a.customer_phone
  from public.appointments a
  left join public.treatments t on t.id = a.treatment_id
  where a.id = p_appointment
$$;

-- ---------------------------------------------------------------------------
-- Salon dashboard tiles (owner of the salon or admin). Week = Monday-based, Europe/Berlin.
-- ---------------------------------------------------------------------------
create or replace function public.salon_dashboard_stats(p_salon uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz         text := 'Europe/Berlin';
  v_day_start  timestamptz := date_trunc('day',  now() at time zone v_tz) at time zone v_tz;
  v_week_start timestamptz := date_trunc('week', now() at time zone v_tz) at time zone v_tz;
  v_booked_min numeric;
  v_capacity_min numeric;
begin
  if not (public.owns_salon(p_salon) or public.is_admin()) then
    raise exception 'not allowed';
  end if;

  select coalesce(sum(extract(epoch from (ends_at - starts_at)) / 60), 0) into v_booked_min
  from public.appointments
  where salon_id = p_salon and status in ('confirmed', 'completed')
    and starts_at >= v_week_start and starts_at < v_week_start + interval '7 days';

  -- weekly opening minutes x active staff = bookable capacity
  select coalesce(sum(extract(epoch from (closes_at - opens_at)) / 60), 0)
         * (select count(*) from public.staff where salon_id = p_salon and active)
    into v_capacity_min
  from public.opening_hours where salon_id = p_salon;

  return jsonb_build_object(
    'today_bookings', (
      select count(*) from public.appointments
      where salon_id = p_salon and status <> 'cancelled'
        and starts_at >= v_day_start and starts_at < v_day_start + interval '1 day'),
    'week_revenue_eur', (
      select coalesce(sum(st.price_cents), 0) / 100.0
      from public.appointments a
      join public.salon_treatments st on st.salon_id = a.salon_id and st.treatment_id = a.treatment_id
      where a.salon_id = p_salon and a.status in ('confirmed', 'completed')
        and a.starts_at >= v_week_start and a.starts_at < v_week_start + interval '7 days'),
    'utilization_percent',
      case when v_capacity_min > 0 then round(100 * v_booked_min / v_capacity_min) else 0 end,
    'new_customers', (
      select count(*) from (
        select customer_id, min(created_at) as first_booking
        from public.appointments
        where salon_id = p_salon and customer_id is not null
        group by customer_id) f
      where f.first_booking >= v_week_start)
  );
end $$;
grant execute on function public.salon_dashboard_stats(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: platform stats with per-channel dispatch cost, and the salon audit list.
-- ---------------------------------------------------------------------------
create or replace function public.admin_platform_stats(p_from timestamptz default date_trunc('month', now()))
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return jsonb_build_object(
    'total_bookings',     (select count(*) from public.appointments),
    'bookings_in_period', (select count(*) from public.appointments where created_at >= p_from),
    'active_salons',      (select count(*) from public.salons where status = 'active'),
    'pending_salons',     (select count(*) from public.salons where status = 'pending'),
    'push_sent',  (select count(*) from public.notification_log where channel = 'push'  and status = 'sent' and created_at >= p_from),
    'sms_sent',   (select count(*) from public.notification_log where channel = 'sms'   and status = 'sent' and created_at >= p_from),
    'email_sent', (select count(*) from public.notification_log where channel = 'email' and status = 'sent' and created_at >= p_from),
    'push_cost_eur',  (select coalesce(sum(cost_micro_eur), 0) / 1000000.0 from public.notification_log where channel = 'push'  and created_at >= p_from),
    'sms_cost_eur',   (select coalesce(sum(cost_micro_eur), 0) / 1000000.0 from public.notification_log where channel = 'sms'   and created_at >= p_from),
    'email_cost_eur', (select coalesce(sum(cost_micro_eur), 0) / 1000000.0 from public.notification_log where channel = 'email' and created_at >= p_from),
    'dispatch_cost_eur', (select coalesce(sum(cost_micro_eur), 0) / 1000000.0 from public.notification_log where created_at >= p_from)
  );
end $$;

create or replace function public.admin_salon_overview()
returns table (id uuid, name text, category public.salon_category, city text,
               status public.salon_status, bookings_this_month bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return query
    select s.id, s.name, s.category, s.city, s.status,
           (select count(*) from public.appointments a
             where a.salon_id = s.id and a.created_at >= date_trunc('month', now())),
           s.created_at
    from public.salons s
    order by (s.status = 'pending') desc, s.created_at desc;
end $$;
grant execute on function public.admin_salon_overview() to authenticated;
