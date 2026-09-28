"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Scissors, Sparkles, Waves, Brush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bookingSteps } from "@/lib/mock-data";

const services = [
  { label: "Haarschnitt", icon: Scissors },
  { label: "Coloration", icon: Sparkles },
  { label: "Bartschnitt", icon: Brush },
  { label: "Massage", icon: Waves },
];

const times = ["09:00", "10:30", "13:15", "15:00", "16:45", "18:30"];

export function CustomersSection() {
  const [activeStep, setActiveStep] = React.useState(0);
  const [service, setService] = React.useState(services[0].label);
  const [time, setTime] = React.useState(times[1]);
  const [confirmed, setConfirmed] = React.useState(false);

  function goTo(index: number) {
    setActiveStep(index);
    if (index !== 2) setConfirmed(false);
  }

  return (
    <section id="fuer-kunden" className="relative py-28 sm:py-36">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Für Kund:innen
          </span>
          <h2 className="font-heading mt-3 max-w-md text-4xl leading-[1.1] tracking-tight sm:text-5xl">
            Buchen in drei Klicks, nicht in drei Anrufen.
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Keine Warteschleifen, kein Hin-und-Her. Appointy zeigt dir freie
            Termine in Echtzeit — probier die Vorschau gleich selbst aus.
          </p>

          <ol className="mt-10 space-y-1">
            {bookingSteps.map((s, index) => (
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
                  Welcher Service darf es sein?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {services.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setService(s.label)}
                      className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                        service === s.label
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/60"
                      }`}
                    >
                      <s.icon className="size-5 text-primary" />
                      <span className="text-sm font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
                <Button
                  className="mt-6 w-full rounded-xl"
                  onClick={() => goTo(1)}
                >
                  Weiter zu freien Zeiten
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
                  Freie Slots heute für {service}
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {times.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                        time === t
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted/60"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <Button
                  className="mt-6 w-full rounded-xl"
                  onClick={() => goTo(2)}
                >
                  Weiter zur Bestätigung
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
                  Termin bestätigen
                </p>
                <div className="space-y-2.5 rounded-xl border border-border bg-card/60 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium">{service}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uhrzeit</span>
                    <span className="font-medium">Heute, {time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Salon</span>
                    <span className="font-medium">Obsidian Cuts</span>
                  </div>
                </div>

                {!confirmed ? (
                  <Button
                    className="mt-6 w-full rounded-xl"
                    onClick={() => setConfirmed(true)}
                  >
                    Termin bestätigen
                  </Button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary"
                  >
                    <Check className="size-4" />
                    Termin gebucht — bis später!
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
