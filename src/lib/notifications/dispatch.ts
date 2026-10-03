// Server-only: drains public.notification_log and delivers each row via Expo Push, Twilio SMS or Resend e-mail.
// Next.js port of supabase/functions/dispatch-notifications (same queue RPCs, same status transitions).
// Needs SUPABASE_SERVICE_ROLE_KEY — never import this from client code.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Channel = "push" | "sms" | "email";
type LogRow = {
  id: string;
  appointment_id: string | null;
  channel: Channel;
  recipient: string;
  payload: string;
  attempts: number;
};
type SendResult = { providerId?: string; costMicroEur: number };
type ProviderError = Error & { invalid?: boolean };

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 25;
const env = (k: string) => process.env[k] ?? "";

let admin: SupabaseClient | null = null;
function adminClient() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  return (admin ??= createClient(url, key, { auth: { persistSession: false } }));
}

/** Twilio needs E.164. Salons type numbers like "030 1234 5678" or "0049 151 …"; German default. */
export function toE164(raw: string, defaultCountry = env("SMS_DEFAULT_COUNTRY_CODE") || "49"): string {
  const n = raw.replace(/[\s\-()./]/g, "");
  if (n.startsWith("+")) return n;
  if (n.startsWith("00")) return `+${n.slice(2)}`;
  if (n.startsWith("0")) return `+${defaultCountry}${n.slice(1)}`;
  return `+${n}`;
}

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
    const err: ProviderError = new Error(`Expo: ${ticket?.message ?? "unknown error"}`);
    err.invalid = ticket?.details?.error === "DeviceNotRegistered";
    throw err;
  }
  return { providerId: ticket.id, costMicroEur: 0 };
}

async function sendSms(row: LogRow): Promise<SendResult> {
  const sid = env("TWILIO_ACCOUNT_SID");
  const from = env("TWILIO_FROM") || env("TWILIO_PHONE_NUMBER");
  const service = env("TWILIO_MESSAGING_SERVICE_SID");
  if (!sid || !env("TWILIO_AUTH_TOKEN") || !(from || service)) {
    throw new Error("Twilio not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER)");
  }
  const form = new URLSearchParams({ To: toE164(row.recipient), Body: row.payload });
  if (service) form.set("MessagingServiceSid", service);
  else form.set("From", from);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${env("TWILIO_AUTH_TOKEN")}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: ProviderError = new Error(`Twilio HTTP ${res.status}: ${json.message ?? JSON.stringify(json)}`);
    // 21211 = invalid "To" number, 21614 = not a mobile number: retrying cannot help.
    err.invalid = json.code === 21211 || json.code === 21614;
    throw err;
  }
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
  if (!env("RESEND_API_KEY") || !env("RESEND_FROM")) throw new Error("Resend not configured (RESEND_API_KEY / RESEND_FROM)");
  const attachments: { filename: string; content: string }[] = [];
  if (row.appointment_id) {
    const { data: appt } = await adminClient()
      .from("appointments")
      .select("id, starts_at, ends_at, treatment_id, customer_name")
      .eq("id", row.appointment_id)
      .single();
    if (appt) attachments.push({ filename: "termin.ics", content: Buffer.from(icsFor(appt), "utf8").toString("base64") });
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

async function deliver(row: LogRow): Promise<"sent" | "failed" | "retry"> {
  const db = adminClient();
  try {
    const r = await senders[row.channel](row);
    await db
      .from("notification_log")
      .update({ status: "sent", provider_id: r.providerId, cost_micro_eur: r.costMicroEur, sent_at: new Date().toISOString(), error: null })
      .eq("id", row.id);
    return "sent";
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const invalid = (e as ProviderError).invalid;
    if (invalid && row.channel === "push") await db.from("push_tokens").delete().eq("token", row.recipient);
    const final = invalid || row.attempts >= MAX_ATTEMPTS;
    await db
      .from("notification_log")
      .update({ status: final ? "failed" : "pending", error: message.slice(0, 500) })
      .eq("id", row.id);
    return final ? "failed" : "retry";
  }
}

/** Claims up to BATCH_SIZE pending rows (atomically, safe against parallel runs) and delivers them. */
export async function dispatchPendingNotifications(ids?: string[]) {
  const db = adminClient();
  await db.rpc("requeue_stuck_notifications");
  const { data, error } = await db.rpc("claim_notifications", { p_limit: BATCH_SIZE, p_ids: ids?.length ? ids : null });
  if (error) throw new Error(`claim_notifications: ${error.message}`);

  const results = await Promise.all((data as LogRow[]).map(deliver));
  const count = (s: string) => results.filter((r) => r === s).length;
  return { claimed: results.length, sent: count("sent"), retry: count("retry"), failed: count("failed") };
}
