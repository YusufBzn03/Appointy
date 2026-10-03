-- Run with: supabase test db   (pgTAP, executed against the local stack after migrations)
begin;
select plan(18);

-- Fixtures (as superuser: no JWT claims, guards allow this) ---------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'cust@test.dev',  '{"role":"customer","full_name":"Cleo Kunde"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner@test.dev', '{"role":"salon_owner"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'other@test.dev', '{"role":"salon_owner"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'evil@test.dev',  '{"role":"admin"}');   -- must NOT become admin

select is((select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'),
          'customer', 'signup metadata cannot request the admin role');
select is((select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'),
          'salon_owner', 'salon_owner signup keeps its role');

insert into public.salons (id, owner_id, name, slug, category, postal_code, city, phone, status, lat, lng) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'Active Cuts',  'active-cuts',  'friseur', '10115', 'Berlin', '+4915100000001', 'active',  52.53, 13.38),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b2', 'Pending Nails', 'pending-nails', 'nagelstudio', '10115', 'Berlin', '+4915100000002', 'pending', 52.53, 13.38);
insert into public.salon_treatments (salon_id, treatment_id) values
  ('10000000-0000-0000-0000-000000000001', 'haircut'),
  ('10000000-0000-0000-0000-000000000002', 'nails');
insert into public.staff (id, salon_id, name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Mara');

-- Anonymous visitor -------------------------------------------------------------------------
set local role anon;
select is((select count(*)::int from public.salons), 1, 'anon sees only active salons');
select is((select count(*)::int from public.available_treatments where id = 'nails'), 0,
          'niche treatment stays hidden while its only salon is pending');
select is((select count(*)::int from public.appointments), 0, 'anon cannot read appointments');

-- Customer ----------------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select lives_ok($$
  insert into public.appointments (salon_id, staff_id, treatment_id, customer_id, customer_name, customer_phone, starts_at, ends_at)
  values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'haircut',
          '00000000-0000-0000-0000-0000000000a1', 'Cleo Kunde', '+49 151 111', '2030-01-01 10:00+00', '2030-01-01 10:30+00')
$$, 'customer can book an active salon');

select throws_ok($$
  insert into public.appointments (salon_id, staff_id, treatment_id, customer_id, customer_name, customer_phone, starts_at, ends_at)
  values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'haircut',
          '00000000-0000-0000-0000-0000000000a1', 'Cleo Kunde', '+49 151 111', '2030-01-01 10:15+00', '2030-01-01 10:45+00')
$$, '23P01', null, 'overlapping booking for the same staff member is rejected');

select throws_ok($$ update public.appointments set starts_at = starts_at + interval '1 day' $$,
                 'customers can only cancel their appointment', 'customer cannot reschedule via update');
select lives_ok($$ update public.appointments set status = 'cancelled' $$, 'customer can cancel');

select throws_ok($$ update public.profiles set role = 'admin' where id = auth.uid() $$,
                 'role can only be changed by the service role', 'customer cannot self-promote to admin');
select throws_ok($$ select public.admin_platform_stats() $$, 'admin only', 'customer cannot read platform stats');

select throws_ok($$ select public.onboard_salon('{"name":"X","category":"friseur","postal_code":"10115","city":"Berlin","phone":"1"}') $$,
                 'only salon owners can onboard a salon', 'customer cannot call onboard_salon');

-- Salon owner -------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select throws_ok($$ update public.salons set status = 'active' where id = '10000000-0000-0000-0000-000000000002' $$,
                 'status and owner can only be changed by an admin', 'owner cannot approve own salon');
select is((select count(*)::int from public.appointments), 0, 'other salon owner cannot see foreign appointments');

select public.onboard_salon($$ {
    "name":"Neu Salon","category":"friseur","street":"Weg 1","postal_code":"10115","city":"Berlin","phone":"+4930123",
    "treatments":["haircut","beard"],
    "hours":{"days":[1,2,3,4,5],"opens":"09:00","closes":"18:00"},
    "staff":["Mara","Jonas"],
    "notifications":{"push":true,"sms":false,"email":true}
  } $$);
select is((select status::text from public.salons where id = (select id from public.salons where name = 'Neu Salon')), 'pending',
          'onboard_salon creates a pending salon');
select is((select count(*)::int from public.staff_treatments where salon_id = (select id from public.salons where name = 'Neu Salon')), 4,
          'both staff members get both treatments');
select is((select sms_enabled from public.notification_settings where salon_id = (select id from public.salons where name = 'Neu Salon')), false,
          'notification settings are stored');

-- Notification queue (as superuser) ----------------------------------------------------------
reset role;
select is((select count(*)::int from public.notification_log where channel = 'sms' and payload = 'Neuer Termin! 01.01.2030 11:00 Uhr | Haare schneiden & Stylen | Kunde: Cleo Kunde | Tel: +49 151 111'),
          1, 'booking queued one SMS with the agreed payload format');

select * from finish();
rollback;
