import { supabase } from "@/lib/supabase/client";
import type { NotifyChannel, StaffMember, TreatmentId } from "@/lib/mock-data";

function db() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

export type OwnerSalon = { id: string; name: string; city: string; status: "pending" | "active" | "suspended" };

export type DashboardStats = {
  todayBookings: number;
  weekRevenueEur: number;
  utilizationPercent: number;
  newCustomers: number;
};

/** One booking with every channel it was dispatched on (mirrors the mock SmsLogEntry, but raw ISO times). */
export type LiveLogEntry = {
  id: string;
  channels: NotifyChannel[];
  createdAt: string;
  customer: string;
  treatment: TreatmentId;
  startsAt: string;
  phone: string;
  failed: boolean;
};

export type LiveDashboard = {
  salon: OwnerSalon;
  stats: DashboardStats;
  staff: StaffMember[];
  offered: TreatmentId[];
  channels: Record<NotifyChannel, boolean>;
  log: LiveLogEntry[];
};

/** The signed-in owner's first salon, or null if they haven't onboarded yet. */
export async function fetchOwnerSalon(userId: string): Promise<OwnerSalon | null> {
  const { data, error } = await db()
    .from("salons")
    .select("id, name, city, status")
    .eq("owner_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as OwnerSalon | null;
}

const DAY_MS = 86_400_000;

export async function fetchDashboard(salon: OwnerSalon): Promise<LiveDashboard> {
  const client = db();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today.getTime() + 7 * DAY_MS);

  const [stats, staff, offered, hours, appts, settings, log] = await Promise.all([
    client.rpc("salon_dashboard_stats", { p_salon: salon.id }),
    client
      .from("staff")
      .select("id, name, staff_treatments(treatment_id), staff_calendars(id)")
      .eq("salon_id", salon.id)
      .eq("active", true)
      .order("created_at"),
    client.from("salon_treatments").select("treatment_id").eq("salon_id", salon.id),
    client.from("opening_hours").select("weekday, opens_at, closes_at").eq("salon_id", salon.id),
    client
      .from("appointments")
      .select("staff_id, starts_at, ends_at")
      .eq("salon_id", salon.id)
      .eq("status", "confirmed")
      .gte("starts_at", today.toISOString())
      .lt("starts_at", weekEnd.toISOString()),
    client.from("notification_settings").select("push_enabled, sms_enabled, email_enabled").eq("salon_id", salon.id).maybeSingle(),
    client
      .from("notification_log")
      .select("id, appointment_id, channel, status, created_at, appointments(customer_name, customer_phone, treatment_id, starts_at)")
      .eq("salon_id", salon.id)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  for (const r of [stats, staff, offered, hours, appts, settings, log]) if (r.error) throw r.error;

  const s = stats.data as Record<string, number>;
  const hoursRows = (hours.data ?? []) as { weekday: number; opens_at: string; closes_at: string }[];
  const apptRows = (appts.data ?? []) as { staff_id: string; starts_at: string; ends_at: string }[];
  const minutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  // Next 7 days per staff member: "off" when closed, "busy" from 60 % booked, else "free".
  const staffMembers: StaffMember[] = (staff.data ?? []).map((row) => {
    const availability = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(today.getTime() + i * DAY_MS);
      const open = hoursRows
        .filter((h) => h.weekday === day.getDay())
        .reduce((sum, h) => sum + minutes(h.closes_at) - minutes(h.opens_at), 0);
      if (open === 0) return "off" as const;
      const booked = apptRows
        .filter((a) => a.staff_id === row.id && new Date(a.starts_at).toDateString() === day.toDateString())
        .reduce((sum, a) => sum + (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60_000, 0);
      return booked / open >= 0.6 ? ("busy" as const) : ("free" as const);
    });
    return {
      id: row.id as string,
      name: row.name as string,
      treatments: (row.staff_treatments as { treatment_id: TreatmentId }[]).map((x) => x.treatment_id),
      calendarConnected: (row.staff_calendars as unknown[]).length > 0,
      availability,
    };
  });

  // Group dispatch rows by booking so one line shows all channels it went out on.
  type LogRow = {
    id: string;
    appointment_id: string | null;
    channel: NotifyChannel;
    status: string;
    created_at: string;
    appointments: { customer_name: string; customer_phone: string; treatment_id: TreatmentId; starts_at: string } | null;
  };
  const grouped = new Map<string, LiveLogEntry>();
  for (const r of (log.data ?? []) as unknown as LogRow[]) {
    if (!r.appointments) continue;
    const key = r.appointment_id ?? r.id;
    const entry =
      grouped.get(key) ??
      grouped
        .set(key, {
          id: key,
          channels: [],
          createdAt: r.created_at,
          customer: r.appointments.customer_name,
          treatment: r.appointments.treatment_id,
          startsAt: r.appointments.starts_at,
          phone: r.appointments.customer_phone,
          failed: false,
        })
        .get(key)!;
    if (!entry.channels.includes(r.channel)) entry.channels.push(r.channel);
    if (r.status === "failed") entry.failed = true;
  }

  const n = settings.data as { push_enabled: boolean; sms_enabled: boolean; email_enabled: boolean } | null;

  return {
    salon,
    stats: {
      todayBookings: Number(s.today_bookings ?? 0),
      weekRevenueEur: Number(s.week_revenue_eur ?? 0),
      utilizationPercent: Number(s.utilization_percent ?? 0),
      newCustomers: Number(s.new_customers ?? 0),
    },
    staff: staffMembers,
    offered: (offered.data ?? []).map((r) => r.treatment_id as TreatmentId),
    channels: { push: n?.push_enabled ?? true, sms: n?.sms_enabled ?? true, email: n?.email_enabled ?? true },
    log: [...grouped.values()],
  };
}

/** Enabling also assigns the treatment to every active staff member, otherwise nobody could be booked for it. */
export async function setTreatmentOffered(salonId: string, treatmentId: TreatmentId, offered: boolean, staffIds: string[]) {
  const client = db();
  if (!offered) {
    const { error } = await client.from("salon_treatments").delete().eq("salon_id", salonId).eq("treatment_id", treatmentId);
    if (error) throw error;
    return;
  }
  const { error } = await client.from("salon_treatments").insert({ salon_id: salonId, treatment_id: treatmentId });
  if (error) throw error;
  if (staffIds.length) {
    const { error: e2 } = await client
      .from("staff_treatments")
      .insert(staffIds.map((id) => ({ staff_id: id, salon_id: salonId, treatment_id: treatmentId })));
    if (e2) throw e2;
  }
}

export async function saveChannels(salonId: string, channels: Record<NotifyChannel, boolean>) {
  const { error } = await db()
    .from("notification_settings")
    .upsert({
      salon_id: salonId,
      push_enabled: channels.push,
      sms_enabled: channels.sms,
      email_enabled: channels.email,
    });
  if (error) throw error;
}
