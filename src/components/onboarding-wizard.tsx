"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe2,
  PenLine,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  Plus,
  X,
  MessageSquareText,
  Calendar,
  Mail,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/components/locale-provider";
import { treatmentDefs, treatmentLabel, type TreatmentId } from "@/lib/mock-data";

type Path = "auto" | "manual";

export function OnboardingWizard() {
  const { t } = useLocale();
  const router = useRouter();

  const steps = [
    t.onboarding.stepPath,
    t.onboarding.stepBusiness,
    t.onboarding.stepTreatments,
    t.onboarding.stepSms,
    t.onboarding.stepCalendar,
    t.onboarding.stepReview,
  ];

  const [step, setStep] = React.useState(0);
  const [path, setPath] = React.useState<Path | null>(null);

  const [url, setUrl] = React.useState("");
  const [fetching, setFetching] = React.useState(false);
  const [fetched, setFetched] = React.useState(false);

  const [businessName, setBusinessName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const [selectedTreatments, setSelectedTreatments] = React.useState<TreatmentId[]>([]);
  const [customTreatments, setCustomTreatments] = React.useState<string[]>([]);
  const [customInput, setCustomInput] = React.useState("");

  const [smsEnabled, setSmsEnabled] = React.useState(true);

  const [connections, setConnections] = React.useState({ google: false, outlook: false, email: false });
  const [staff, setStaff] = React.useState<string[]>([]);
  const [staffInput, setStaffInput] = React.useState("");

  const [submitted, setSubmitted] = React.useState(false);

  function toggleTreatment(id: TreatmentId) {
    setSelectedTreatments((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function addCustomTreatment() {
    const value = customInput.trim();
    if (!value) return;
    setCustomTreatments((prev) => [...prev, value]);
    setCustomInput("");
  }

  function addStaff() {
    const value = staffInput.trim();
    if (!value) return;
    setStaff((prev) => [...prev, value]);
    setStaffInput("");
  }

  function runAutoFetch() {
    setFetching(true);
    setTimeout(() => {
      const label = url.replace(/^https?:\/\//, "").split(/[./]/)[0] || "Mein Salon";
      setBusinessName(label.charAt(0).toUpperCase() + label.slice(1));
      setAddress("Musterstraße 12, 10115 Berlin");
      setPhone("+49 30 1234 5678");
      setFetching(false);
      setFetched(true);
    }, 1400);
  }

  // Fixed-format example: the SMS payload itself is sent in the salon's business
  // language, independent of the onboarding UI language, so it stays untranslated here.
  const smsPreview = `Neuer Termin! Morgen, 11:00 Uhr | Haarschnitt & Styling | Kunde: Max Mustermann | Tel: +49 151 2345 6789`;

  const canLeaveBusinessStep = businessName.trim() !== "" && phone.trim() !== "";

  function next() {
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check className="size-8" />
        </span>
        <div>
          <h1 className="font-heading text-3xl tracking-tight">{t.onboarding.successTitle}</h1>
          <p className="mt-2 max-w-sm text-muted-foreground">{t.onboarding.successDesc}</p>
        </div>
        <Button size="lg" className="rounded-full" onClick={() => router.push("/dashboard")}>
          {t.onboarding.goToDashboard}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
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

      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">{t.onboarding.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.onboarding.subtitle}</p>

        <div className="mt-8">
          <Progress value={(step / (steps.length - 1)) * 100} className="h-1.5" />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {steps.map((label, i) => (
              <span key={label} className={i === step ? "font-medium text-primary" : undefined}>
                {i + 1}. {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {step === 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    onClick={() => {
                      setPath("auto");
                      next();
                    }}
                    className={`flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-colors ${
                      path === "auto" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
                    }`}
                  >
                    <Globe2 className="size-6 text-primary" />
                    <div>
                      <p className="font-medium">{t.onboarding.pathAutoTitle}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t.onboarding.pathAutoDesc}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setPath("manual");
                      next();
                    }}
                    className={`flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-colors ${
                      path === "manual" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
                    }`}
                  >
                    <PenLine className="size-6 text-primary" />
                    <div>
                      <p className="font-medium">{t.onboarding.pathManualTitle}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t.onboarding.pathManualDesc}</p>
                    </div>
                  </button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  {path === "auto" && !fetched && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="ob-url">{t.onboarding.urlLabel}</Label>
                        <Input
                          id="ob-url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder={t.onboarding.urlPlaceholder}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        className="rounded-xl"
                        disabled={!url.trim() || fetching}
                        onClick={runAutoFetch}
                      >
                        {fetching ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            {t.onboarding.fetchingLabel}
                          </>
                        ) : (
                          t.onboarding.fetchButton
                        )}
                      </Button>
                    </div>
                  )}

                  {(path === "manual" || fetched) && (
                    <>
                      {fetched && (
                        <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
                          {t.onboarding.fetchedNotice}
                        </p>
                      )}
                      <div className="space-y-1.5">
                        <Label htmlFor="ob-name">{t.onboarding.businessNameLabel}</Label>
                        <Input
                          id="ob-name"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ob-address">
                          {t.onboarding.addressLabel}{" "}
                          <span className="text-muted-foreground">({t.common.optional})</span>
                        </Label>
                        <Input id="ob-address" value={address} onChange={(e) => setAddress(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ob-phone">{t.onboarding.phoneLabel}</Label>
                        <Input
                          id="ob-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+49 30 1234 5678"
                        />
                        <p className="text-xs text-muted-foreground">{t.onboarding.phoneHint}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === 2 && (
                <div>
                  <p className="mb-4 text-sm text-muted-foreground">{t.onboarding.treatmentsHint}</p>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {treatmentDefs.map((def) => (
                      <button
                        key={def.id}
                        onClick={() => toggleTreatment(def.id)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                          selectedTreatments.includes(def.id)
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/60"
                        }`}
                      >
                        <def.icon className="size-4 shrink-0 text-primary" />
                        <span>{treatmentLabel(t, def.id)}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {customTreatments.map((c, i) => (
                      <span
                        key={`${c}-${i}`}
                        className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium"
                      >
                        {c}
                        <button
                          onClick={() => setCustomTreatments((prev) => prev.filter((_, idx) => idx !== i))}
                          aria-label={t.common.remove}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Input
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTreatment())}
                      placeholder={t.onboarding.customTreatmentPlaceholder}
                    />
                    <Button type="button" variant="secondary" onClick={addCustomTreatment}>
                      <Plus className="size-4" />
                      {t.onboarding.customTreatmentAdd}
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
                    <div>
                      <p className="font-medium">{t.onboarding.smsTitle}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t.onboarding.smsDesc}</p>
                    </div>
                    <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} aria-label={t.onboarding.smsToggleLabel} />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium text-muted-foreground">
                      {t.onboarding.smsPreviewLabel}
                    </p>
                    <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-4">
                      <MessageSquareText className="mt-0.5 size-5 shrink-0 text-primary" />
                      <p
                        dir="ltr"
                        className={`text-left text-sm ${!smsEnabled ? "text-muted-foreground line-through" : ""}`}
                      >
                        {smsPreview}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8">
                  <div>
                    <p className="font-medium">{t.onboarding.calendarTitle}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t.onboarding.calendarDesc}</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      {(
                        [
                          { key: "google" as const, label: t.onboarding.connectGoogle, icon: Calendar },
                          { key: "outlook" as const, label: t.onboarding.connectOutlook, icon: Calendar },
                          { key: "email" as const, label: t.onboarding.connectEmail, icon: Mail },
                        ]
                      ).map((c) => (
                        <Button
                          key={c.key}
                          type="button"
                          variant={connections[c.key] ? "default" : "outline"}
                          className="justify-start rounded-xl"
                          onClick={() => setConnections((prev) => ({ ...prev, [c.key]: !prev[c.key] }))}
                        >
                          <c.icon className="size-4" />
                          {connections[c.key] ? t.onboarding.connected : c.label}
                          {connections[c.key] && <Check className="size-3.5" />}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="font-medium">{t.onboarding.staffTitle}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t.onboarding.staffDesc}</p>

                    <div className="mt-3 space-y-2">
                      {staff.map((name, i) => (
                        <div
                          key={`${name}-${i}`}
                          className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                        >
                          {name}
                          <button
                            onClick={() => setStaff((prev) => prev.filter((_, idx) => idx !== i))}
                            aria-label={t.common.remove}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Input
                        value={staffInput}
                        onChange={(e) => setStaffInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStaff())}
                        placeholder={t.onboarding.staffNamePlaceholder}
                      />
                      <Button type="button" variant="secondary" onClick={addStaff}>
                        <UserPlus className="size-4" />
                        {t.onboarding.addStaffButton}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">{t.onboarding.reviewDesc}</p>
                  <dl className="divide-y divide-border rounded-xl border border-border text-sm">
                    {(
                      [
                        [t.onboarding.businessNameLabel, businessName || "—", false],
                        [t.onboarding.phoneLabel, phone || "—", true],
                        [
                          t.onboarding.stepTreatments,
                          [...selectedTreatments.map((id) => treatmentLabel(t, id)), ...customTreatments].join(
                            ", "
                          ) || "—",
                          false,
                        ],
                        [t.onboarding.smsToggleLabel, smsEnabled ? "✓" : "—", false],
                        [
                          t.onboarding.calendarTitle,
                          Object.entries(connections)
                            .filter(([, v]) => v)
                            .map(([k]) => ({ google: "Google", outlook: "Outlook", email: t.auth.emailLabel })[k])
                            .join(", ") || "—",
                          false,
                        ],
                        [t.onboarding.staffTitle, staff.join(", ") || "—", false],
                      ] as [string, string, boolean][]
                    ).map(([label, value, ltr]) => (
                      <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd dir={ltr ? "ltr" : undefined} className="text-right font-medium">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0} className="rounded-xl">
            <ArrowLeft className="size-4" />
            {t.common.back}
          </Button>

          {step === 0 ? null : step === 1 ? (
            <Button onClick={next} disabled={!canLeaveBusinessStep} className="rounded-xl">
              {t.common.next}
              <ArrowRight className="size-4" />
            </Button>
          ) : step < steps.length - 1 ? (
            <Button onClick={next} className="rounded-xl">
              {t.common.next}
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={() => setSubmitted(true)} className="rounded-xl">
              {t.onboarding.submitButton}
              <Check className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
