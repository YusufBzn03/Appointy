// Supabase Edge Function (Deno): drains public.notification_log and delivers each row
// via Expo Push, Twilio SMS or Resend e-mail.
//
// Triggers:
//   * Database Webhook on notification_log INSERT  (body: { type: "INSERT", record: {...} })
//   * pg_cron / manual call                         (empty body -> processes up to BATCH_SIZE pending rows)
// Auth: header `x-dispatch-secret: $DISPATCH_SECRET` (set the same value on the webhook).
//
// Secrets: DISPATCH_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (or TWILIO_MESSAGING_SERVICE_SID),
//          RESEND_API_KEY, RESEND_FROM, optional EXPO_ACCESS_TOKEN, SMS_COST_MICRO_EUR, EMAIL_COST_MICRO_EUR.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.

import { createClient } from "npm:@supabase/supabase-js@2";

type Channel = "push" | "sms" | "email";
type LogRow = {
  id: string;
  salon_id: string;
  appointment_id: string | null;
  channel: Channel;
  recipient: string;
  payload: string;
  attempts: number;
};
type SendResult = { providerId?: string; costMicroEur: number; invalidRecipient?: boolean };

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 25;
const env = (k: string) => Deno.env.get(k) ?? "";

const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
async function sendPush(row: LogRow): Promise<SendResult> {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(env("EXPO_ACCESS_TOKEN") && { authorization: `Bearer ${env("EXPO_ACCESS_TOKEN")}` }),
    },
    body: JSON.stringify({
      to: row.recipient,
      title: "Appointy",
      body: row.payload,
      sound: "default",
      priority: "high",
      data: { appointmentId: row.appointment_id },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Expo HTTP ${res.status}: ${JSON.stringify(json)}`);
  const ticket = json.data;
  if (ticket?.status !== "ok") {
    const err = new Error(`Expo: ${ticket?.message ?? "unknown error"}`) as Error & { invalid?: boolean };
    err.invalid = ticket?.details?.error === "DeviceNotRegistered";
    throw err;
  }
  return { providerId: ticket.id, costMicroEur: 0 };
}

/** Twilio needs E.164. Salons type numbers like "030 1234 5678" or "0049 151 …"; German default. */
export function toE164(raw: string, defaultCountry = env("SMS_DEFAULT_COUNTRY_CODE") || "49"): string {
  const n = raw.replace(/[\s\-()./]/g, "");
  if (n.startsWith("+")) return n;
  if (n.startsWith("00")) return `+${n.slice(2)}`;
  if (n.startsWith("0")) return `+${defaultCountry}${n.slice(1)}`;
  return `+${n}`;
}

async function sendSms(row: LogRow): Promise<SendResult> {
  const sid = env("TWILIO_ACCOUNT_SID");
  const form = new URLSearchParams({ To: toE164(row.recipient), Body: row.payload });
  if (env("TWILIO_MESSAGING_SERVICE_SID")) form.set("MessagingServiceSid", env("TWILIO_MESSAGING_SERVICE_SID"));
  else form.set("From", env("TWILIO_FROM"));

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${sid}:${env("TWILIO_AUTH_TOKEN")}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Twilio HTTP ${res.status}: ${json.message ?? JSON.stringify(json)}`);
  return { providerId: json.sid, costMicroEur: Number(env("SMS_COST_MICRO_EUR")) || 50_000 };
}

function icsFor(a: { id: string; starts_at: string; ends_at: string; treatment_id: string; customer_name: string }) {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Appointy//Booking//DE",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${a.id}@appointy`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(a.starts_at)}`,
    `DTEND:${fmt(a.ends_at)}`,
    `SUMMARY:${a.treatment_id} – ${a.customer_name}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

async function sendEmail(row: LogRow): Promise<SendResult> {
  const attachments: { filename: string; content: string }[] = [];
  if (row.appointment_id) {
    const { data: appt } = await supabase
      .from("appointments")
      .select("id, starts_at, ends_at, treatment_id, customer_name")
      .eq("id", row.appointment_id)
      .single();
    if (appt) attachments.push({ filename: "termin.ics", content: btoa(unescape(encodeURIComponent(icsFor(appt)))) });
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env("RESEND_API_KEY")}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env("RESEND_FROM"),
      to: [row.recipient],
      subject: row.payload.split(" | ")[0] ?? "Neuer Termin",
      text: row.payload.replaceAll(" | ", "\n"),
      attachments,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${json.message ?? JSON.stringify(json)}`);
  return { providerId: json.id, costMicroEur: Number(env("EMAIL_COST_MICRO_EUR")) || 400 };
}

const senders: Record<Channel, (row: LogRow) => Promise<SendResult>> = {
  push: sendPush,
  sms: sendSms,
  email: sendEmail,
};

// ---------------------------------------------------------------------------
// Queue processing
// ---------------------------------------------------------------------------
async function process(row: LogRow): Promise<"sent" | "failed" | "retry"> {
  try {
    const r = await senders[row.channel](row);
    await supabase
      .from("notification_log")
      .update({ status: "sent", provider_id: r.providerId, cost_micro_eur: r.costMicroEur, sent_at: new Date().toISOString(), error: null })
      .eq("id", row.id);
    return "sent";
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const invalid = (e as { invalid?: boolean }).invalid;
    if (invalid && row.channel === "push") await supabase.from("push_tokens").delete().eq("token", row.recipient);
    const final = invalid || row.attempts >= MAX_ATTEMPTS;
    await supabase
      .from("notification_log")
      .update({ status: final ? "failed" : "pending", error: message.slice(0, 500) })
      .eq("id", row.id);
    return final ? "failed" : "retry";
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!env("DISPATCH_SECRET") || req.headers.get("x-dispatch-secret") !== env("DISPATCH_SECRET")) {
    return new Response("unauthorized", { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const ids: string[] | null = body?.record?.id ? [body.record.id] : null;

  await supabase.rpc("requeue_stuck_notifications");
  const { data, error } = await supabase.rpc("claim_notifications", { p_limit: BATCH_SIZE, p_ids: ids });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const results = await Promise.all((data as LogRow[]).map(process));
  const count = (s: string) => results.filter((r) => r === s).length;
  return Response.json({ claimed: results.length, sent: count("sent"), retry: count("retry"), failed: count("failed") });
});
