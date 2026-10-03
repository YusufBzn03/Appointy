import { createClient } from "@supabase/supabase-js";
import { dispatchPendingNotifications } from "@/lib/notifications/dispatch";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Who may trigger a dispatch run:
 *  - cron / database webhook: `x-dispatch-secret: $DISPATCH_SECRET` or `Authorization: Bearer $CRON_SECRET`
 *    (Vercel Cron sends the latter automatically when CRON_SECRET is set)
 *  - a signed-in user right after booking: `Authorization: Bearer <supabase access token>`
 * Running only ever delivers rows that already sit in notification_log, so a user token is harmless.
 */
async function authorized(req: Request): Promise<boolean> {
  const secret = process.env.DISPATCH_SECRET;
  if (secret && req.headers.get("x-dispatch-secret") === secret) return true;

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return false;
  const cron = process.env.CRON_SECRET;
  if (cron && bearer === cron) return true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  const { data, error } = await createClient(url, anon, { auth: { persistSession: false } }).auth.getUser(bearer);
  return !error && !!data.user;
}

async function run(req: Request) {
  if (!(await authorized(req))) return new Response("unauthorized", { status: 401 });

  // Database Webhook body: { type: "INSERT", record: { id } } — otherwise sweep all pending rows.
  const body = await req.json().catch(() => ({}));
  const ids: string[] | undefined = body?.record?.id ? [body.record.id] : undefined;

  try {
    return Response.json(await dispatchPendingNotifications(ids));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "dispatch failed" }, { status: 500 });
  }
}

export const POST = run;
export const GET = run; // Vercel Cron issues GET requests
