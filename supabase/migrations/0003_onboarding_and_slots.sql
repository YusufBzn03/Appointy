-- Appointy — atomic salon onboarding + "next free slot" lookup.

-- ---------------------------------------------------------------------------
-- onboard_salon(p jsonb): one transaction for the whole wizard result.
-- {
--   "name": "...", "category": "friseur", "street": "...", "postal_code": "10115", "city": "Berlin",
--   "lat": 52.5, "lng": 13.4, "phone": "+49...", "website": "...",
--   "treatments": ["haircut", "beard"],
--   "hours": { "days": [1,2,3,4,5,6], "opens": "09:00", "closes": "18:00" },
--   "staff": ["Mara", "Jonas"],
--   "notifications": { "push": true, "sms": true, "email": true }
-- }
-- The salon is created with status 'pending' (salons_guard); an admin approves it.
-- Every staff member gets all offered treatments; fine-tuning happens in the dashboard.
-- ---------------------------------------------------------------------------
create or replace function public.onboard_salon(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_salon uuid;
  v_name  text := nullif(trim(p ->> 'name'), '');
  v_staff uuid;
  v_t     text;
  v_day   int;
  v_member text;
begin
  if auth.uid() is null or public.current_role_name() is distinct from 'salon_owner' then
    raise exception 'only salon owners can onboard a salon';
  end if;
  if v_name is null then raise exception 'name is required'; end if;

  insert into public.salons (owner_id, name, slug, category, street, postal_code, city, lat, lng, phone, website)
  values (
    auth.uid(), v_name,
    trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 6),
    (p ->> 'category')::public.salon_category,
    p ->> 'street', p ->> 'postal_code', p ->> 'city',
    (p ->> 'lat')::double precision, (p ->> 'lng')::double precision,
    p ->> 'phone', nullif(p ->> 'website', '')
  ) returning id into v_salon;

  for v_t in select jsonb_array_elements_text(coalesce(p -> 'treatments', '[]'::jsonb)) loop
    insert into public.salon_treatments (salon_id, treatment_id) values (v_salon, v_t);
  end loop;

  if p -> 'hours' is not null then
    for v_day in select jsonb_array_elements_text(p -> 'hours' -> 'days')::int loop
      insert into public.opening_hours (salon_id, weekday, opens_at, closes_at)
      values (v_salon, v_day, (p -> 'hours' ->> 'opens')::time, (p -> 'hours' ->> 'closes')::time);
    end loop;
  end if;

  for v_member in select jsonb_array_elements_text(coalesce(p -> 'staff', '[]'::jsonb)) loop
    insert into public.staff (salon_id, name) values (v_salon, v_member) returning id into v_staff;
    insert into public.staff_treatments (staff_id, salon_id, treatment_id)
      select v_staff, v_salon, treatment_id from public.salon_treatments where salon_id = v_salon;
  end loop;

  insert into public.notification_settings (salon_id, push_enabled, sms_enabled, email_enabled)
  values (
    v_salon,
    coalesce((p -> 'notifications' ->> 'push')::boolean, true),
    coalesce((p -> 'notifications' ->> 'sms')::boolean, true),
    coalesce((p -> 'notifications' ->> 'email')::boolean, true)
  );

  return v_salon;
end $$;
revoke all on function public.onboard_salon(jsonb) from public, anon;
grant execute on function public.onboard_salon(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- next_free_slots(): earliest 30-minute-aligned start within 7 days at which at least one
-- active staff member is free for the salon's shortest treatment, inside opening hours
-- (Europe/Berlin). Returns one row per active salon; `slot` is null when nothing is free.
-- ---------------------------------------------------------------------------
create or replace function public.next_free_slots(p_salon_ids uuid[] default null)
returns table (salon_id uuid, slot timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, (
    select g.t
    from generate_series(
           date_trunc('hour', now()) + interval '1 hour',
           now() + interval '7 days',
           interval '30 minutes') as g(t)
    cross join lateral (
      select min(st.duration_min) as d from public.salon_treatments st where st.salon_id = s.id
    ) dur
    where exists (
        select 1 from public.opening_hours oh
        where oh.salon_id = s.id
          and oh.weekday = extract(dow from g.t at time zone 'Europe/Berlin')::int
          and (g.t at time zone 'Europe/Berlin')::time >= oh.opens_at
          and (g.t at time zone 'Europe/Berlin')::time + make_interval(mins => dur.d) <= oh.closes_at)
      and exists (
        select 1 from public.staff sf
        where sf.salon_id = s.id and sf.active
          and not exists (
            select 1 from public.appointments a
            where a.staff_id = sf.id and a.status = 'confirmed'
              and tstzrange(a.starts_at, a.ends_at) && tstzrange(g.t, g.t + make_interval(mins => dur.d))))
    order by g.t
    limit 1
  )
  from public.salons s
  where s.status = 'active' and (p_salon_ids is null or s.id = any (p_salon_ids))
$$;
grant execute on function public.next_free_slots(uuid[]) to anon, authenticated;
