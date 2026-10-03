import { supabase } from "@/lib/supabase/client";
import type { TreatmentId } from "@/lib/mock-data";

export type BookingTreatment = { id: TreatmentId; durationMin: number; priceCents: number | null };
export type BookingStaff = { id: string; name: string; treatmentIds: TreatmentId[] };
export type OpeningHours = { weekday: number; opens: string; closes: string }; // "HH:MM[:SS]"
export type BusySlot = { staffId: string; start: Date; end: Date };
export type Slot = { start: Date; staffId: string };

function db() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

export async function fetchBookingData(salonId: string) {
  const client = db();
  const [treatments, staff, hours] = await Promise.all([
    client.from("salon_treatments").select("treatment_id, duration_min, price_cents").eq("salon_id", salonId),
    client.from("staff").select("id, name, staff_treatments(treatment_id)").eq("salon_id", salonId).eq("active", true),
    client.from("opening_hours").select("weekday, opens_at, closes_at").eq("salon_id", salonId),
  ]);
  for (const r of [treatments, staff, hours]) if (r.error) throw r.error;

  return {
    treatments: (treatments.data ?? []).map((r) => ({
      id: r.treatment_id as TreatmentId,
      durationMin: r.duration_min as number,
      priceCents: r.price_cents as number | null,
    })) satisfies BookingTreatment[],
    staff: (staff.data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      treatmentIds: (r.staff_treatments as { treatment_id: TreatmentId }[]).map((x) => x.treatment_id),
    })) satisfies BookingStaff[],
    hours: (hours.data ?? []).map((r) => ({
      weekday: r.weekday as number,
      opens: r.opens_at as string,
      closes: r.closes_at as string,
    })) satisfies OpeningHours[],
  };
}

/** Busy ranges via the SECURITY DEFINER busy_slots() RPC — no customer data is exposed. */
export async function fetchBusySlots(salonId: string, from: Date, to: Date): Promise<BusySlot[]> {
  const { data, error } = await db().rpc("busy_slots", {
    p_salon: salonId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw error;
  return (data as { staff_id: string; starts_at: string; ends_at: string }[]).map((r) => ({
    staffId: r.staff_id,
    start: new Date(r.starts_at),
    end: new Date(r.ends_at),
  }));
}

const SLOT_STEP_MIN = 30;
const MIN_LEAD_MIN = 30;

function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
}

/**
 * Free start times for one day. A start is offered when it lies inside opening hours, leaves room for
 * `durationMin`, is at least 30 min in the future and at least one eligible staff member has no
 * overlapping appointment; that member is attached to the slot (first free one wins for "any").
 * Times use the browser's local zone; the DB stores timestamptz, so bookings stay unambiguous.
 */
export function computeSlots(opts: {
  day: Date;
  hours: OpeningHours[];
  busy: BusySlot[];
  durationMin: number;
  staffIds: string[];
  now?: Date;
}): Slot[] {
  const { day, hours, busy, durationMin, staffIds } = opts;
  const earliest = new Date((opts.now ?? new Date()).getTime() + MIN_LEAD_MIN * 60_000);
  const slots = new Map<number, Slot>();

  for (const h of hours.filter((x) => x.weekday === day.getDay())) {
    const closes = atTime(day, h.closes);
    for (let start = atTime(day, h.opens); start.getTime() + durationMin * 60_000 <= closes.getTime(); ) {
      const end = new Date(start.getTime() + durationMin * 60_000);
      if (start >= earliest && !slots.has(start.getTime())) {
        const free = staffIds.find(
          (id) => !busy.some((b) => b.staffId === id && b.start < end && b.end > start)
        );
        if (free) slots.set(start.getTime(), { start, staffId: free });
      }
      start = new Date(start.getTime() + SLOT_STEP_MIN * 60_000);
    }
  }
  return [...slots.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Asks the server to deliver the rows the `appointments_notify` trigger just queued. Fire-and-forget: a failure
 * must not fail the booking — the cron sweep picks up anything left in `pending`.
 */
async function triggerDispatch() {
  try {
    const { data } = await db().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/notifications/dispatch", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      keepalive: true,
    });
  } catch {
    /* swallowed on purpose, see above */
  }
}

export type CreateAppointmentResult = { ok: true } | { ok: false; reason: "taken" | "error" };

/** Inserting fires `appointments_notify`, which queues push/SMS/email rows for the dispatcher. */
export async function createAppointment(input: {
  salonId: string;
  staffId: string;
  treatmentId: TreatmentId;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  start: Date;
  durationMin: number;
}): Promise<CreateAppointmentResult> {
  const { error } = await db()
    .from("appointments")
    .insert({
      salon_id: input.salonId,
      staff_id: input.staffId,
      treatment_id: input.treatmentId,
      customer_id: input.customerId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail ?? null,
      starts_at: input.start.toISOString(),
      ends_at: new Date(input.start.getTime() + input.durationMin * 60_000).toISOString(),
    });
  if (!error) {
    void triggerDispatch();
    return { ok: true };
  }
  // 23P01 = exclusion_violation from appointments_no_overlap: someone booked the slot first.
  return { ok: false, reason: error.code === "23P01" ? "taken" : "error" };
}
