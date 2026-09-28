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
  const [signupMode, setSignupMode] = React.useState(false);

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

            <div className="mt-4 space-y-3">
              {signupMode && (
                <div className="space-y-1.5">
                  <Label htmlFor="auth-name">{t.auth.nameLabel}</Label>
                  <Input id="auth-name" placeholder={t.auth.nameLabel} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="auth-email">{t.auth.emailLabel}</Label>
                <Input id="auth-email" type="email" placeholder="you@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="auth-password">{t.auth.passwordLabel}</Label>
                <Input id="auth-password" type="password" placeholder="••••••••" />
              </div>

              <Button className="w-full rounded-xl">
                {signupMode ? t.auth.signupInstead : t.auth.loginButton}
              </Button>

              <button
                type="button"
                onClick={() => setSignupMode((v) => !v)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                {signupMode ? t.auth.loginButton : `${t.auth.noAccount} ${t.auth.signupInstead}`}
              </button>
            </div>
          </TabsContent>

          <TabsContent value="salon" className="pt-2">
            <DialogHeader>
              <DialogTitle>{t.auth.salonTitle}</DialogTitle>
              <DialogDescription>{t.auth.salonSubtitle}</DialogDescription>
            </DialogHeader>

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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
