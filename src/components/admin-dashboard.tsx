"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  CalendarCheck,
  MessageSquareText,
  Wallet,
  Smartphone,
  Mail,
  Cloud,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/components/locale-provider";
import { useAuth } from "@/components/auth-provider";
import { adminSalons, adminStats, categoryLabel, type AdminSalon } from "@/lib/mock-data";
import {
  fetchPlatformStats,
  fetchAdminSalons,
  setSalonStatus,
  type PlatformStats,
  type AdminSalonRow,
} from "@/lib/supabase/admin";

type Status = AdminSalon["status"];
type Row = { id: string; name: string; industry: string; status: Status; bookingsThisMonth: number };
type Tile = { icon: typeof Wallet; label: string; value: string };

const eur = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} €`;

function AdminView({
  tiles,
  infra,
  rows,
  onSetStatus,
}: {
  tiles: Tile[];
  infra: { name: string; costEur: number | null }[];
  rows: Row[];
  onSetStatus: (id: string, status: Status) => void;
}) {
  const { t } = useLocale();

  const statusLabel: Record<Status, string> = {
    active: t.admin.statusActive,
    pending: t.admin.statusPending,
    suspended: t.admin.statusSuspended,
  };

  const statusVariant: Record<Status, "default" | "secondary" | "destructive"> = {
    active: "default",
    pending: "secondary",
    suspended: "destructive",
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">{t.admin.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.admin.subtitle}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
              <s.icon className="size-5 text-primary" />
              <p className="font-heading mt-3 text-2xl tracking-tight">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <p className="font-medium">{t.notify.adminInfraTitle}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            {infra.map((i) => (
              <div key={i.name} className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">{i.name}</p>
                <p className="font-heading mt-1 text-xl tabular-nums">{i.costEur === null ? "—" : eur(i.costEur)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <p className="font-medium">{t.admin.salonsTableTitle}</p>
          <div className="mt-3 rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.columnSalon}</TableHead>
                  <TableHead>{t.admin.columnCategory}</TableHead>
                  <TableHead>{t.admin.columnStatus}</TableHead>
                  <TableHead className="text-right">{t.admin.columnBookings}</TableHead>
                  <TableHead className="text-right">{t.admin.columnActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((salon) => (
                  <TableRow key={salon.id}>
                    <TableCell className="font-medium">{salon.name}</TableCell>
                    <TableCell className="text-muted-foreground">{salon.industry}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[salon.status]}>{statusLabel[salon.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{salon.bookingsThisMonth}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        {salon.status !== "active" && (
                          <Button size="sm" variant="secondary" onClick={() => onSetStatus(salon.id, "active")}>
                            {t.admin.approveAction}
                          </Button>
                        )}
                        {salon.status !== "suspended" && (
                          <Button size="sm" variant="outline" onClick={() => onSetStatus(salon.id, "suspended")}>
                            {t.admin.suspendAction}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-heading text-lg tracking-tight">Appointy Admin</span>
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function AdminGate({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
        {message ? (
          <p className="max-w-sm text-muted-foreground">{message}</p>
        ) : (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

function MockAdmin() {
  const { t } = useLocale();
  const [salons, setSalons] = React.useState<AdminSalon[]>(adminSalons);

  return (
    <AdminView
      tiles={[
        { icon: Wallet, label: t.admin.mrrLabel, value: eur(adminStats.mrrEur) },
        { icon: CalendarCheck, label: t.admin.totalBookingsLabel, value: adminStats.totalBookings.toLocaleString() },
        { icon: MessageSquareText, label: t.admin.smsSentLabel, value: adminStats.smsSent.toLocaleString() },
        { icon: Smartphone, label: t.notify.adminPushSent, value: adminStats.pushSent.toLocaleString() },
        { icon: Mail, label: t.notify.adminEmailSent, value: adminStats.emailSent.toLocaleString() },
        { icon: Cloud, label: t.notify.adminInfraCost, value: eur(adminStats.infraCostEur) },
        { icon: TrendingUp, label: t.admin.smsCostLabel, value: eur(adminStats.smsCostEur) },
      ]}
      infra={adminStats.infraBreakdown}
      rows={salons}
      onSetStatus={(id, status) => setSalons((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))}
    />
  );
}

function LiveAdmin() {
  const { t } = useLocale();
  const { session, role, loading: authLoading } = useAuth();
  const [stats, setStats] = React.useState<PlatformStats | null>(null);
  const [salons, setSalons] = React.useState<AdminSalonRow[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  const isAdmin = role === "admin";

  React.useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    Promise.all([fetchPlatformStats(), fetchAdminSalons()])
      .then(([s, rows]) => {
        if (cancelled) return;
        setStats(s);
        setSalons(rows);
      })
      .catch((err) => {
        console.error("admin load failed:", err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (authLoading || (session && role === null)) return <AdminGate />;
  if (!session || !isAdmin) return <AdminGate message={t.live.signInAsAdmin} />;
  if (failed) return <AdminGate message={t.live.loadError} />;
  if (!stats || !salons) return <AdminGate />;

  async function changeStatus(id: string, status: Status) {
    const previous = salons;
    setSalons((rows) => rows?.map((r) => (r.id === id ? { ...r, status } : r)) ?? rows);
    try {
      await setSalonStatus(id, status);
    } catch (err) {
      console.error(err);
      setSalons(previous);
    }
  }

  return (
    <AdminView
      // No subscription/billing table exists yet, so MRR and Supabase's own bill are shown as "—"
      // rather than invented; dispatch costs come from notification_log.
      tiles={[
        { icon: Wallet, label: t.admin.mrrLabel, value: "—" },
        { icon: CalendarCheck, label: t.admin.totalBookingsLabel, value: stats.totalBookings.toLocaleString() },
        { icon: MessageSquareText, label: t.admin.smsSentLabel, value: stats.smsSent.toLocaleString() },
        { icon: Smartphone, label: t.notify.adminPushSent, value: stats.pushSent.toLocaleString() },
        { icon: Mail, label: t.notify.adminEmailSent, value: stats.emailSent.toLocaleString() },
        { icon: Cloud, label: t.notify.adminInfraCost, value: eur(stats.dispatchCostEur) },
        { icon: TrendingUp, label: t.admin.smsCostLabel, value: eur(stats.smsCostEur) },
      ]}
      infra={[
        { name: "Supabase", costEur: null },
        { name: "Twilio", costEur: stats.smsCostEur },
        { name: "Resend", costEur: stats.emailCostEur },
        { name: "Expo Push", costEur: stats.pushCostEur },
      ]}
      rows={salons.map((s) => ({
        id: s.id,
        name: s.name,
        industry: `${categoryLabel(t, s.category)} · ${s.city}`,
        status: s.status,
        bookingsThisMonth: s.bookingsThisMonth,
      }))}
      onSetStatus={changeStatus}
    />
  );
}

export function AdminDashboard() {
  const { available } = useAuth();
  return available ? <LiveAdmin /> : <MockAdmin />;
}
