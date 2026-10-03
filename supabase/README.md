# Appointy – Supabase

```
supabase/
  config.toml
  migrations/0001_init.sql            schema, RLS, triggers, storage policies
  migrations/0002_dispatch_queue.sql  queue claiming + salon display fields
  migrations/0003_onboarding_and_slots.sql  onboard_salon() + next_free_slots()
  migrations/0004_payload_labels_and_dashboards.sql  German payload labels + dashboard/admin RPCs
  functions/dispatch-notifications/   Expo / Twilio / Resend dispatcher
  tests/database/rls.test.sql         pgTAP tests for roles, RLS, booking rules, queue
```

## A. Test the migrations locally (Supabase CLI + Docker)

Prerequisites: Docker Desktop running, `npm i -D supabase` (or `scoop install supabase`).

```bash
npx supabase start          # boots Postgres, Auth, Storage, Edge runtime
npx supabase db reset       # drops the local DB and re-applies migrations/ in order
npx supabase test db        # runs tests/database/*.sql (pgTAP) – expect "Result: PASS"
npx supabase db lint        # static check of the plpgsql functions
```

If `db reset` fails, the error names the migration file and line. Fix, run `db reset` again.

## B. Test in the Dashboard (hosted project)

Use a throw-away project, not production.

1. SQL Editor → paste `0001_init.sql` → Run. When it succeeds, paste `0002_dispatch_queue.sql` → Run, then `0003_onboarding_and_slots.sql`, then `0004_payload_labels_and_dashboards.sql`
   (separate runs: the new enum value in 0002 can't share a transaction with 0001).
2. Optionally paste `tests/database/rls.test.sql` (it ends in `rollback`, so nothing is persisted).
   Enable pgTAP first: Database → Extensions → `pgtap`.
3. Check the Table Editor shows every table with the "RLS enabled" badge.

Or from the CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`.

## C. Edge Function

```bash
npx supabase secrets set \
  DISPATCH_SECRET=<random> \
  TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM=+49... \
  RESEND_API_KEY=... RESEND_FROM="Appointy <termine@yourdomain.de>"
npx supabase functions deploy dispatch-notifications --no-verify-jwt
```

Local run: `npx supabase functions serve dispatch-notifications --env-file ./supabase/.env.local`, then

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/dispatch-notifications \
  -H "x-dispatch-secret: <random>"
# -> {"claimed":3,"sent":0,"retry":3,"failed":0}   (no provider keys locally = retry; that is expected)
```

Wiring (once, in the SQL editor, replace `<ref>` / secret):

```sql
-- 1) immediate delivery for each new row
--    Dashboard → Database → Webhooks → new: table notification_log, event INSERT,
--    type Supabase Edge Function → dispatch-notifications, header x-dispatch-secret.

-- 2) retry sweep every minute (failed attempts go back to 'pending', max 3 tries)
select cron.schedule('dispatch-notifications', '* * * * *', $$
  select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/dispatch-notifications',
    headers := '{"x-dispatch-secret":"<random>"}'::jsonb)
$$);
```

Not verified end to end: no Supabase CLI or Docker was available when this was written, so the SQL, the pgTAP
file and the function have not been executed yet. Run section A first and report any error.
