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
  dashboardStats,
  type TreatmentId,
} from "@/lib/mock-data";

const weekdayIndex = [0, 1, 2, 3, 4, 5, 6];

export function SalonDashboard() {
  const { t } = useLocale();
  const [smsEnabled, setSmsEnabled] = React.useState(true);
  const [offeredTreatments, setOfferedTreatments] = React.useState<TreatmentId[]>([
    "haircut",
    "coloring",
    "beard",
  ]);

  function toggleTreatment(id: TreatmentId) {
    setOfferedTreatments((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const stats = [
    { icon: CalendarDays, label: t.dashboard.todayBookings, value: String(dashboardStats.todayBookings) },
    { icon: TrendingUp, label: t.dashboard.weekRevenue, value: `${dashboardStats.weekRevenueEur.toLocaleString()} €` },
    { icon: Gauge, label: t.dashboard.utilization, value: `${dashboardStats.utilizationPercent}%` },
    { icon: Users, label: t.dashboard.newCustomers, value: String(dashboardStats.newCustomers) },
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
        <p className="mt-1 text-muted-foreground">Obsidian Cuts · Berlin, Mitte</p>

        <Tabs defaultValue="overview" className="mt-8">
          <TabsList>
            <TabsTrigger value="overview">{t.dashboard.overviewTab}</TabsTrigger>
            <TabsTrigger value="calendar">{t.dashboard.calendarTab}</TabsTrigger>
            <TabsTrigger value="staff">{t.dashboard.staffTab}</TabsTrigger>
            <TabsTrigger value="treatments">{t.dashboard.treatmentsTab}</TabsTrigger>
            <TabsTrigger value="sms">{t.dashboard.smsTab}</TabsTrigger>
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
              {staffMembers.map((member) => (
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
              {staffMembers.map((member) => (
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
                  onClick={() => toggleTreatment(def.id)}
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
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
              <div>
                <p className="font-medium">{t.dashboard.smsHubTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.dashboard.smsHubDesc}</p>
              </div>
              <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} aria-label={t.dashboard.smsToggleLabel} />
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-muted-foreground">{t.dashboard.smsLogTitle}</p>
              <div className="space-y-2">
                {smsLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm"
                  >
                    <MessageSquareText className="mt-0.5 size-4 shrink-0 text-primary" />
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
