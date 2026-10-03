"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/locale-provider";
import { useAuth } from "@/components/auth-provider";
import { useSalonData } from "@/components/salon-data-provider";
import { treatmentLabel, type Salon, type TreatmentId } from "@/lib/mock-data";
import {
  fetchBookingData,
  fetchBusySlots,
  computeSlots,
  createAppointment,
  type BookingTreatment,
  type BookingStaff,
  type OpeningHours,
  type BusySlot,
  type Slot,
} from "@/lib/supabase/booking";

type Data = { treatments: BookingTreatment[]; staff: BookingStaff[]; hours: OpeningHours[] };
type Step = "treatment" | "staff" | "time" | "confirm" | "done";

const ANY = "any";
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function BookingDialog({
  salon,
  live,
  open,
  onOpenChange,
}: {
  salon: Salon;
  /** True when salons come from Supabase; mock salons have no bookable rows. */
  live: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useLocale();
  const { session } = useAuth();
  const { refreshSlots } = useSalonData();
  const lang = locale === "sr" ? "sr-Latn" : locale;

  const [data, setData] = React.useState<Data | null>(null);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [step, setStep] = React.useState<Step>("treatment");
  const [treatment, setTreatment] = React.useState<BookingTreatment | null>(null);
  const [staffChoice, setStaffChoice] = React.useState<string>(ANY);
  const [date, setDate] = React.useState(() => isoDay(new Date()));
  const [slot, setSlot] = React.useState<Slot | null>(null);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load treatments / staff / opening hours once, the first time the dialog opens.
  React.useEffect(() => {
    if (!open || !live || data || loadFailed) return;
    let cancelled = false;
    fetchBookingData(salon.id)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setLoadFailed(true));
    return () => {
      cancelled = true;
    };
  }, [open, live, data, loadFailed, salon.id]);

  const eligibleStaff = React.useMemo(() => {
    if (!data || !treatment) return [];
    return data.staff.filter((s) => s.treatmentIds.includes(treatment.id));
  }, [data, treatment]);

  const staffIds = React.useMemo(
    () => (staffChoice === ANY ? eligibleStaff.map((s) => s.id) : [staffChoice]),
    [staffChoice, eligibleStaff]
  );

  // Busy ranges for the chosen day. Loading state is derived (key mismatch) instead of set in the effect.
  const busyKey = step === "time" ? `${salon.id}|${date}` : null;
  const [busyResult, setBusyResult] = React.useState<{ key: string; busy: BusySlot[] } | null>(null);
  React.useEffect(() => {
    if (!busyKey) return;
    let cancelled = false;
    const from = new Date(`${date}T00:00:00`);
    const to = new Date(from.getTime() + 86_400_000);
    fetchBusySlots(salon.id, from, to)
      .then((b) => !cancelled && setBusyResult({ key: busyKey, busy: b }))
      .catch(() => !cancelled && setBusyResult({ key: busyKey, busy: [] }));
    return () => {
      cancelled = true;
    };
  }, [busyKey, date, salon.id]);
  const slotsLoading = busyKey !== null && busyResult?.key !== busyKey;

  const slots = React.useMemo(() => {
    if (!data || !treatment || !busyResult || busyResult.key !== busyKey) return [];
    return computeSlots({
      day: new Date(`${date}T00:00:00`),
      hours: data.hours,
      busy: busyResult.busy,
      durationMin: treatment.durationMin,
      staffIds,
    });
  }, [data, treatment, busyResult, busyKey, date, staffIds]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      // Reset after the close animation so a finished booking doesn't reopen on "done".
      setTimeout(() => {
        setStep("treatment");
        setTreatment(null);
        setStaffChoice(ANY);
        setSlot(null);
        setError(null);
      }, 200);
    }
  }

  async function confirm(customerName: string) {
    if (!session || !treatment || !slot) return;
    setBusy(true);
    setError(null);
    const res = await createAppointment({
      salonId: salon.id,
      staffId: slot.staffId,
      treatmentId: treatment.id,
      customerId: session.user.id,
      customerName: customerName.trim(),
      customerPhone: phone.trim(),
      customerEmail: session.user.email ?? undefined,
      start: slot.start,
      durationMin: treatment.durationMin,
    });
    setBusy(false);
    if (res.ok) {
      setStep("done");
      refreshSlots();
    } else if (res.reason === "taken") {
      setError(t.booking.slotTaken);
      setSlot(null);
      setBusyResult(null); // force a fresh busy_slots() read
      setStep("time");
    } else {
      setError(t.booking.errorGeneric);
    }
  }

  const timeFmt = (d: Date) => d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
  const fullName = name || (session?.user.user_metadata?.full_name as string | undefined) || "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.booking.title}</DialogTitle>
          <DialogDescription>{salon.name}</DialogDescription>
        </DialogHeader>

        {!live || loadFailed ? (
          <p className="text-sm text-muted-foreground">{!live ? t.booking.demoOnly : t.booking.errorGeneric}</p>
        ) : !data ? (
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
        ) : step === "treatment" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t.booking.stepTreatment}</p>
            {data.treatments.map((tr) => (
              <button
                key={tr.id}
                onClick={() => {
                  setTreatment(tr);
                  setStaffChoice(ANY);
                  setStep("staff");
                }}
                className="flex w-full items-center justify-between rounded-xl border border-border px-3.5 py-2.5 text-left text-sm hover:bg-muted/60"
              >
                <span>{treatmentLabel(t, tr.id as TreatmentId)}</span>
                <span className="text-muted-foreground">
                  {tr.durationMin} {t.booking.minutes}
                  {tr.priceCents != null && ` · ${(tr.priceCents / 100).toFixed(0)} €`}
                </span>
              </button>
            ))}
          </div>
        ) : step === "staff" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t.booking.stepStaff}</p>
            {[{ id: ANY, name: t.booking.anyStaff }, ...eligibleStaff].map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setStaffChoice(s.id);
                  setSlot(null);
                  setStep("time");
                }}
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-left text-sm hover:bg-muted/60"
              >
                {s.name}
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setStep("treatment")}>
              {t.common.back}
            </Button>
          </div>
        ) : step === "time" ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">{t.booking.stepTime}</p>
            <Input
              type="date"
              value={date}
              min={isoDay(new Date())}
              onChange={(e) => e.target.value && (setDate(e.target.value), setSlot(null))}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            {slotsLoading ? (
              <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.booking.noSlots}</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.start.getTime()}
                    onClick={() => {
                      setSlot(s);
                      setError(null);
                      setStep("confirm");
                    }}
                    className="rounded-lg border border-border py-1.5 text-sm tabular-nums hover:bg-primary hover:text-primary-foreground"
                  >
                    {timeFmt(s.start)}
                  </button>
                ))}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => setStep("staff")}>
              {t.common.back}
            </Button>
          </div>
        ) : step === "confirm" && treatment && slot ? (
          <div className="space-y-3">
            <p className="rounded-xl bg-muted/60 px-3.5 py-2.5 text-sm">
              {treatmentLabel(t, treatment.id)} ·{" "}
              {slot.start.toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" })},{" "}
              {timeFmt(slot.start)}
            </p>
            {!session ? (
              <p className="text-sm text-muted-foreground">{t.booking.signInFirst}</p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-name">{t.booking.yourName}</Label>
                  <Input id="bk-name" value={fullName} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-phone">{t.booking.yourPhone}</Label>
                  <Input
                    id="bk-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+49 151 2345 6789"
                    autoComplete="tel"
                  />
                </div>
              </>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="w-full rounded-xl"
              disabled={busy || !session || !fullName.trim() || phone.trim().length < 6}
              onClick={() => {
                void confirm(fullName);
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t.booking.confirmButton}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setStep("time")}>
              {t.common.back}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="size-6" />
            </span>
            <p className="font-heading text-xl">{t.booking.successTitle}</p>
            <p className="text-sm text-muted-foreground">{t.booking.successDesc}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
