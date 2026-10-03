-- Appointy — notification queue claiming + salon display fields.
-- The functions below are plpgsql on purpose: a `language sql` body is analysed at CREATE time, and
-- referencing the enum value 'processing' added in this same transaction would fail with 55P04.
-- Kept separate from 0001 because `alter type ... add value` cannot be used in the
-- same transaction that first references the new value.

alter type public.notify_status add value if not exists 'processing';

alter table public.notification_log
  add column if not exists attempts int not null default 0;

-- Denormalised display fields for the salon cards (to be replaced by a reviews table later).
alter table public.salons
  add column if not exists rating       numeric(2,1) check (rating between 0 and 5),
  add column if not exists review_count int not null default 0,
  add column if not exists price_level  smallint check (price_level between 1 and 3),
  add column if not exists badge        text;

-- Atomically claim up to p_limit pending rows so overlapping runs (webhook + cron) never
-- send the same message twice. `for update skip locked` makes concurrent callers pick different rows.
create or replace function public.claim_notifications(p_limit int default 25, p_ids uuid[] default null)
returns setof public.notification_log
language plpgsql security definer set search_path = public as $$
begin
  return query
  with claimed as (
    update public.notification_log n
       set status = 'processing', attempts = n.attempts + 1
     where n.id in (
       select l.id from public.notification_log l
        where l.status = 'pending' and (p_ids is null or l.id = any (p_ids))
        order by l.created_at
        limit p_limit
        for update skip locked
     )
    returning n.*
  )
  select * from claimed;
end $$;

-- Only the Edge Function (service role) may claim.
revoke all on function public.claim_notifications(int, uuid[]) from public, anon, authenticated;
grant execute on function public.claim_notifications(int, uuid[]) to service_role;

-- Rows stuck in 'processing' (function crashed mid-run) become retryable after 5 minutes.
create or replace function public.requeue_stuck_notifications() returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  with r as (
    update public.notification_log
       set status = 'pending'
     where status = 'processing' and created_at < now() - interval '5 minutes'
       and sent_at is null and attempts < 3
    returning 1)
  select count(*)::int into v from r;
  return v;
end $$;
revoke all on function public.requeue_stuck_notifications() from public, anon, authenticated;
grant execute on function public.requeue_stuck_notifications() to service_role;
