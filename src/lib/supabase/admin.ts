import { supabase } from "@/lib/supabase/client";
import type { SalonCategory } from "@/lib/mock-data";

function db() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

export type PlatformStats = {
  totalBookings: number;
  pushSent: number;
  smsSent: number;
  emailSent: number;
  pushCostEur: number;
  smsCostEur: number;
  emailCostEur: number;
  dispatchCostEur: number;
};

export type AdminSalonRow = {
  id: string;
  name: string;
  category: SalonCategory;
  city: string;
  status: "pending" | "active" | "suspended";
  bookingsThisMonth: number;
};

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await db().rpc("admin_platform_stats");
  if (error) throw error;
  const s = data as Record<string, number>;
  const n = (k: string) => Number(s[k] ?? 0);
  return {
    totalBookings: n("total_bookings"),
    pushSent: n("push_sent"),
    smsSent: n("sms_sent"),
    emailSent: n("email_sent"),
    pushCostEur: n("push_cost_eur"),
    smsCostEur: n("sms_cost_eur"),
    emailCostEur: n("email_cost_eur"),
    dispatchCostEur: n("dispatch_cost_eur"),
  };
}

export async function fetchAdminSalons(): Promise<AdminSalonRow[]> {
  const { data, error } = await db().rpc("admin_salon_overview");
  if (error) throw error;
  return (data as { id: string; name: string; category: SalonCategory; city: string; status: AdminSalonRow["status"]; bookings_this_month: number }[]).map(
    (r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      city: r.city,
      status: r.status,
      bookingsThisMonth: Number(r.bookings_this_month),
    })
  );
}

/** Allowed for admins by RLS (salons_admin_all) and the salons_guard trigger. */
export async function setSalonStatus(id: string, status: AdminSalonRow["status"]) {
  const { error } = await db().from("salons").update({ status }).eq("id", id);
  if (error) throw error;
}
