"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Store, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/locale-provider";
import { useAuth } from "@/components/auth-provider";

/** Shared e-mail/password form; `role` decides what a sign-up creates (never admin). */
function CredentialsForm({
  role,
  onDone,
}: {
  role: "customer" | "salon_owner";
  onDone: () => void;
}) {
  const { t, locale } = useLocale();
  const { available, signIn, signUp } = useAuth();
  const [signupMode, setSignupMode] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (signupMode) {
      const { error, needsConfirmation } = await signUp({ email, password, fullName, role, locale });
      if (error) setMessage(t.auth.authError);
      else if (needsConfirmation) setMessage(t.auth.authCheckEmail);
      else onDone();
    } else {
      const error = await signIn(email, password);
      if (error) setMessage(t.auth.authError);
      else onDone();
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      {signupMode && (
        <div className="space-y-1.5">
          <Label htmlFor={`auth-name-${role}`}>{t.auth.nameLabel}</Label>
          <Input
            id={`auth-name-${role}`}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t.auth.nameLabel}
            autoComplete="name"
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={`auth-email-${role}`}>{t.auth.emailLabel}</Label>
        <Input
          id={`auth-email-${role}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`auth-password-${role}`}>{t.auth.passwordLabel}</Label>
        <Input
          id={`auth-password-${role}`}
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete={signupMode ? "new-password" : "current-password"}
        />
      </div>

      {(message || !available) && (
        <p className="text-sm text-muted-foreground" role="status">
          {message ?? t.auth.authUnavailable}
        </p>
      )}

      <Button type="submit" className="w-full rounded-xl" disabled={busy || !available}>
        {signupMode ? t.auth.signupInstead : t.auth.loginButton}
      </Button>

      <button
        type="button"
        onClick={() => {
          setSignupMode((v) => !v);
          setMessage(null);
        }}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {signupMode ? t.auth.loginButton : `${t.auth.noAccount} ${t.auth.signupInstead}`}
      </button>
    </form>
  );
}

export function AuthModal({
  open,
  onOpenChange,
  defaultTab = "customer",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "customer" | "salon";
}) {
  const { t } = useLocale();
  const router = useRouter();
  const { session, role } = useAuth();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" key={defaultTab}>
        <Tabs defaultValue={defaultTab}>
          <TabsList className="w-full">
            <TabsTrigger value="customer" className="gap-1.5">
              <User className="size-3.5" />
              {t.auth.tabCustomer}
            </TabsTrigger>
            <TabsTrigger value="salon" className="gap-1.5">
              <Store className="size-3.5" />
              {t.auth.tabSalon}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="pt-2">
            <DialogHeader>
              <DialogTitle>{t.auth.customerTitle}</DialogTitle>
              <DialogDescription>{t.auth.customerSubtitle}</DialogDescription>
            </DialogHeader>
            <CredentialsForm role="customer" onDone={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="salon" className="pt-2">
            <DialogHeader>
              <DialogTitle>{t.auth.salonTitle}</DialogTitle>
              <DialogDescription>{t.auth.salonSubtitle}</DialogDescription>
            </DialogHeader>

            {session && role === "salon_owner" ? (
              <Button
                className="mt-4 w-full rounded-xl"
                onClick={() => {
                  onOpenChange(false);
                  router.push("/onboarding");
                }}
              >
                {t.auth.startOnboarding}
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <CredentialsForm
                role="salon_owner"
                onDone={() => {
                  onOpenChange(false);
                  router.push("/onboarding");
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
