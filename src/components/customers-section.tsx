"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Scissors, Sparkles, Waves, Brush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { treatmentLabel, type TreatmentId } from "@/lib/mock-data";

const serviceOptions: { id: TreatmentId; icon: typeof Scissors }[] = [
  { id: "haircut", icon: Scissors },
  { id: "coloring", icon: Sparkles },
  { id: "beard", icon: Brush },
  { id: "massage", icon: Waves },
];

const times = ["09:00", "10:30", "13:15", "15:00", "16:45", "18:30"];

export function CustomersSection() {
  const { t } = useLocale();
  const [activeStep, setActiveStep] = React.useState(0);
  const [service, setService] = React.useState<TreatmentId>("haircut");
  const [time, setTime] = React.useState(times[1]);
  const [confirmed, setConfirmed] = React.useState(false);

  const steps = [
    { step: "01", title: t.customers.step1Title, description: t.customers.step1Desc },
    { step: "02", title: t.customers.step2Title, description: t.customers.step2Desc },
    { step: "03", title: t.customers.step3Title, description: t.customers.step3Desc },
  ];

  function goTo(index: number) {
    setActiveStep(index);
    if (index !== 2) setConfirmed(false);
  }

  return (
    <section id="fuer-kunden" className="relative py-28 sm:py-36">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            {t.customers.eyebrow}
          </span>
          <h2 className="font-heading mt-3 max-w-md text-4xl leading-[1.1] tracking-tight sm:text-5xl">
            {t.customers.title}
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">{t.customers.subtitle}</p>

          <ol className="mt-10 space-y-1">
            {steps.map((s, index) => (
              <li key={s.step}>
                <button
                  onClick={() => goTo(index)}
                  className={`flex w-full items-start gap-4 rounded-xl px-3 py-3.5 text-left transition-colors ${
                    activeStep === index ? "bg-muted" : "hover:bg-muted/60"
                  }`}
                >
                  <span
                    className={`font-heading flex size-9 shrink-0 items-center justify-center rounded-full border text-sm transition-colors ${
                      activeStep === index
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {s.step}
                  </span>
                  <span>
                    <span className="block font-medium">{s.title}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {s.description}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <AnimatePresence mode="wait">
            {activeStep === 0 && (
              <motion.div
                key="service"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <p className="mb-4 text-sm font-medium text-muted-foreground">
                  {t.customers.servicePrompt}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {serviceOptions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setService(s.id)}
                      className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                        service === s.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/60"
                      }`}
                    >
                      <s.icon className="size-5 text-primary" />
                      <span className="text-sm font-medium">{treatmentLabel(t, s.id)}</span>
                    </button>
                  ))}
                </div>
                <Button className="mt-6 w-full rounded-xl" onClick={() => goTo(1)}>
                  {t.customers.continueToTime}
                </Button>
              </motion.div>
            )}

            {activeStep === 1 && (
              <motion.div
                key="time"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <p className="mb-4 text-sm font-medium text-muted-foreground">
                  {t.customers.timePrompt} {treatmentLabel(t, service)}
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {times.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setTime(slot)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                        time === slot
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted/60"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
                <Button className="mt-6 w-full rounded-xl" onClick={() => goTo(2)}>
                  {t.customers.continueToConfirm}
                </Button>
              </motion.div>
            )}

            {activeStep === 2 && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <p className="mb-4 text-sm font-medium text-muted-foreground">
                  {t.customers.confirmPrompt}
                </p>
                <div className="space-y-2.5 rounded-xl border border-border bg-card/60 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.customers.confirmService}</span>
                    <span className="font-medium">{treatmentLabel(t, service)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.customers.confirmTime}</span>
                    <span className="font-medium">{time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.customers.confirmSalon}</span>
                    <span className="font-medium">Obsidian Cuts</span>
                  </div>
                </div>

                {!confirmed ? (
                  <Button className="mt-6 w-full rounded-xl" onClick={() => setConfirmed(true)}>
                    {t.customers.confirmButton}
                  </Button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary"
                  >
                    <Check className="size-4" />
                    {t.customers.confirmedNotice}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
