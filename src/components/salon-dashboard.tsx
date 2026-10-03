"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  CalendarDays,
  TrendingUp,
  Users,
  Gauge,
  MessageSquareText,
  Smartphone,
  Mail,
  Check,
  Circle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/components/locale-provider";
import {
  treatmentDefs,
  treatmentLabel,
  staffMembers,
  smsLog,
  type NotifyChannel,
  dashboardStats,
  type TreatmentId,
  type SmsLogEntry,
  type StaffMember,
} from "@/lib/mock-data";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { formatRelativeDateTime } from "@/lib/format";
import {
  fetchOwnerSalon,
  fetchDashboard,
  setTreatmentOffered,
  saveChannels,
  type DashboardStats,
  type LiveDashboard,
} from "@/lib/supabase/dashboard";

const weekdayIndex = [0, 1, 2, 3, 4, 5, 6];

type ViewProps = {
  salonLine: string;
  notice?: string;
  stats: DashboardStats;
  staff: StaffMember[];
  log: SmsLogEntry[];
  offered: TreatmentId[];
  onToggleTreatment: (id: TreatmentId) => void;
  channels: Record<NotifyChannel, boolean>;
  onChannelChange: (id: NotifyChannel, enabled: boolean) => void;
};

function DashboardView({
  salonLine,
  notice,
  stats: s,
  staff,
  log,
  offered: offeredTreatments,
  onToggleTreatment,
  channels,
  onChannelChange,
}: ViewProps) {
  const { t } = useLocale();
  const [pushRegistered, setPushRegistered] = React.useState(false);

  const channelMeta: { id: NotifyChannel; icon: typeof Smartphone; title: string; desc: string }[] = [
    { id: "push", icon: Smartphone, title: t.notify.channelPush, desc: t.notify.channelPushDesc },
    { id: "sms", icon: MessageSquareText, title: t.notify.channelSms, desc: t.notify.channelSmsDesc },
    { id: "email", icon: Mail, title: t.notify.channelEmail, desc: t.notify.channelEmailDesc },
  ];
  const channelIcon = Object.fromEntries(channelMeta.map((c) => [c.id, c.icon])) as Record<NotifyChannel, typeof Smartphone>;
  const stats = [
    { icon: CalendarDays, label: t.dashboard.todayBookings, value: String(s.todayBookings) },
    { icon: TrendingUp, label: t.dashboard.weekRevenue, value: `${s.weekRevenueEur.toLocaleString()} €` },
    { icon: Gauge, label: t.dashboard.utilization, value: `${s.utilizationPercent}%` },
    { icon: Users, label: t.dashboard.newCustomers, value: String(s.newCustomers) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="font-heading text-lg tracking-tight">Appointy</span>
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">{t.dashboard.title}</h1>
        <p className="mt-1 text-muted-foreground">{salonLine}</p>
        {notice && <p className="mt-3 rounded-lg bg-accent/15 px-3 py-2 text-sm">{notice}</p>}

        <Tabs defaultValue="overview" className="mt-8">
          <TabsList>
            <TabsTrigger value="overview">{t.dashboard.overviewTab}</TabsTrigger>
            <TabsTrigger value="calendar">{t.dashboard.calendarTab}</TabsTrigger>
            <TabsTrigger value="staff">{t.dashboard.staffTab}</TabsTrigger>
            <TabsTrigger value="treatments">{t.dashboard.treatmentsTab}</TabsTrigger>
            <TabsTrigger value="sms">{t.notify.hubTab}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
                  <s.icon className="size-5 text-primary" />
                  <p className="font-heading mt-3 text-2xl tracking-tight">{s.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <p className="font-medium">{t.dashboard.staffCalendarTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.dashboard.staffCalendarDesc}</p>

            <div className="mt-5 space-y-3">
              {staff.map((member) => (
                <div key={member.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{member.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {member.treatments.map((id) => treatmentLabel(t, id)).join(", ")}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    {weekdayIndex.map((i) => {
                      const state = member.availability[i];
                      return (
                        <span
                          key={i}
                          className={`h-6 flex-1 rounded-md ${
                            state === "free"
                              ? "bg-primary/30"
                              : state === "busy"
                                ? "bg-primary"
                                : "bg-muted"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="staff" className="mt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {staff.map((member) => (
                <div key={member.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{member.name}</p>
                    <Badge variant={member.calendarConnected ? "default" : "outline"}>
                      {member.calendarConnected ? t.onboarding.connected : t.common.optional}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {member.treatments.map((id) => (
                      <span key={id} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        {treatmentLabel(t, id)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="treatments" className="mt-6">
            <p className="font-medium">{t.dashboard.treatmentsManageTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.dashboard.treatmentsManageDesc}</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {treatmentDefs.map((def) => (
                <button
                  key={def.id}
                  onClick={() => onToggleTreatment(def.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    offeredTreatments.includes(def.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/60"
                  }`}
                >
                  <def.icon className="size-4 shrink-0 text-primary" />
                  <span className="flex-1">{treatmentLabel(t, def.id)}</span>
                  {offeredTreatments.includes(def.id) && <Check className="size-3.5 text-primary" />}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sms" className="mt-6 space-y-6">
            <div>
              <p className="font-medium">{t.notify.channelsTitle}</p>
              <div className="mt-3 space-y-2.5">
                {channelMeta.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
                    <div className="flex items-start gap-3">
                      <c.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium">{c.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{c.desc}</p>
                        {c.id === "push" && channels.push && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            {pushRegistered ? (
                              <Badge>{t.notify.pushRegistered}</Badge>
                            ) : (
                              <button
                                onClick={() => setPushRegistered(true)}
                                className="rounded-full border border-border px-3 py-1 hover:bg-muted/60"
                              >
                                {t.notify.pushRegister}
                              </button>
                            )}
                            <span className="text-muted-foreground">{t.notify.pushTokenHint}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={channels[c.id]}
                      onCheckedChange={(v) => onChannelChange(c.id, v)}
                      aria-label={c.title}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-muted-foreground">{t.dashboard.smsLogTitle}</p>
              <div className="space-y-2">
                {log.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm"
                  >
                    <div className="mt-0.5 flex shrink-0 gap-1">
                      {entry.channels.map((ch) => {
                        const Icon = channelIcon[ch];
                        return <Icon key={ch} className="size-4 text-primary" />;
                      })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">
                        {entry.customer} · {treatmentLabel(t, entry.treatment)} · {entry.time}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Circle className="size-2 fill-primary text-primary" />
                        {entry.timestamp} · {entry.phone}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/** Centered message page for the not-signed-in / no-salon / error states. */
function DashboardGate({ message, action }: { message?: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      {message ? <p className="max-w-sm text-muted-foreground">{message}</p> : <Loader2 className="size-6 animate-spin text-muted-foreground" />}
      {action}
    </div>
  );
}

function MockDashboard() {
  const [offered, setOffered] = React.useState<TreatmentId[]>(["haircut", "coloring", "beard"]);
  const [channels, setChannels] = React.useState<Record<NotifyChannel, boolean>>({ push: true, sms: true, email: true });
  return (
    <DashboardView
      salonLine="Obsidian Cuts · Berlin, Mitte"
      stats={dashboardStats}
      staff={staffMembers}
      log={smsLog}
      offered={offered}
      onToggleTreatment={(id) => setOffered((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))}
      channels={channels}
      onChannelChange={(id, v) => setChannels((prev) => ({ ...prev, [id]: v }))}
    />
  );
}

function LiveDashboardView() {
  const { t, locale } = useLocale();
  const { session, role, loading: authLoading } = useAuth();
  const [data, setData] = React.useState<LiveDashboard | null>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "no-salon" | "error">("loading");
  const userId = session?.user.id;
  const allowed = role === "salon_owner" || role === "admin";

  React.useEffect(() => {
    if (!userId || !allowed) return;
    let cancelled = false;
    fetchOwnerSalon(userId)
      .then((salon) => (salon ? fetchDashboard(salon) : null))
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setState(d ? "ready" : "no-salon");
      })
      .catch((err) => {
        console.error("dashboard load failed:", err);
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, allowed]);

  const home = (
    <Button variant="outline" className="rounded-full" nativeButton={false} render={<Link href="/" />}>
      Appointy
    </Button>
  );
  if (authLoading || (session && role === null)) return <DashboardGate />;
  if (!session || !allowed) return <DashboardGate message={t.live.signInAsOwner} action={home} />;
  if (state === "error") return <DashboardGate message={t.live.loadError} />;
  if (state === "no-salon")
    return (
      <DashboardGate
        message={t.live.noSalonYet}
        action={
          <Button className="rounded-full" nativeButton={false} render={<Link href="/onboarding" />}>
            {t.auth.startOnboarding}
          </Button>
        }
      />
    );
  if (!data) return <DashboardGate />;

  // Optimistic updates; on failure the server state is re-read so the UI never lies.
  async function toggleTreatment(id: TreatmentId) {
    if (!data) return;
    const enable = !data.offered.includes(id);
    setData({ ...data, offered: enable ? [...data.offered, id] : data.offered.filter((x) => x !== id) });
    try {
      await setTreatmentOffered(data.salon.id, id, enable, data.staff.map((m) => m.id));
    } catch (err) {
      console.error(err);
      setData(await fetchDashboard(data.salon));
    }
  }

  async function changeChannel(id: NotifyChannel, enabled: boolean) {
    if (!data) return;
    const channels = { ...data.channels, [id]: enabled };
    setData({ ...data, channels });
    try {
      await saveChannels(data.salon.id, channels);
    } catch (err) {
      console.error(err);
      setData(await fetchDashboard(data.salon));
    }
  }

  return (
    <DashboardView
      salonLine={`${data.salon.name} · ${data.salon.city}`}
      notice={data.salon.status === "pending" ? t.live.pendingNotice : undefined}
      stats={data.stats}
      staff={data.staff}
      log={data.log.map((e) => ({
        id: e.id,
        channels: e.channels,
        timestamp: formatRelativeDateTime(e.createdAt, locale) + (e.failed ? " · ⚠" : ""),
        customer: e.customer,
        treatment: e.treatment,
        time: formatRelativeDateTime(e.startsAt, locale),
        phone: e.phone,
      }))}
      offered={data.offered}
      onToggleTreatment={toggleTreatment}
      channels={data.channels}
      onChannelChange={changeChannel}
    />
  );
}

export function SalonDashboard() {
  const { available } = useAuth();
  return available ? <LiveDashboardView /> : <MockDashboard />;
}
