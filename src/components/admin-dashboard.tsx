"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, CalendarCheck, MessageSquareText, Wallet } from "lucide-react";
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
import { adminSalons, adminStats, type AdminSalon } from "@/lib/mock-data";

export function AdminDashboard() {
  const { t } = useLocale();
  const [salons, setSalons] = React.useState<AdminSalon[]>(adminSalons);

  function setStatus(id: string, status: AdminSalon["status"]) {
    setSalons((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  const statusLabel: Record<AdminSalon["status"], string> = {
    active: t.admin.statusActive,
    pending: t.admin.statusPending,
    suspended: t.admin.statusSuspended,
  };

  const statusVariant: Record<AdminSalon["status"], "default" | "secondary" | "destructive"> = {
    active: "default",
    pending: "secondary",
    suspended: "destructive",
  };

  const stats = [
    { icon: Wallet, label: t.admin.mrrLabel, value: `${adminStats.mrrEur.toLocaleString()} €` },
    { icon: CalendarCheck, label: t.admin.totalBookingsLabel, value: adminStats.totalBookings.toLocaleString() },
    { icon: MessageSquareText, label: t.admin.smsSentLabel, value: adminStats.smsSent.toLocaleString() },
    { icon: TrendingUp, label: t.admin.smsCostLabel, value: `${adminStats.smsCostEur.toLocaleString()} €` },
  ];

  return (
    <div className="min-h-screen bg-background">
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

      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">{t.admin.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.admin.subtitle}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
              <s.icon className="size-5 text-primary" />
              <p className="font-heading mt-3 text-2xl tracking-tight">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
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
                {salons.map((salon) => (
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
                          <Button size="sm" variant="secondary" onClick={() => setStatus(salon.id, "active")}>
                            {t.admin.approveAction}
                          </Button>
                        )}
                        {salon.status !== "suspended" && (
                          <Button size="sm" variant="outline" onClick={() => setStatus(salon.id, "suspended")}>
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
