"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type UserRole = "customer" | "salon_owner" | "admin";

type AuthContextValue = {
  /** False when Supabase env vars are missing: auth UI should explain instead of failing. */
  available: boolean;
  loading: boolean;
  session: Session | null;
  role: UserRole | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  /** Resolves to an error message, or `null` on success. `needsConfirmation` = e-mail confirmation is pending. */
  signUp: (input: {
    email: string;
    password: string;
    fullName?: string;
    role: Exclude<UserRole, "admin">;
    locale: string;
  }) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [role, setRole] = React.useState<UserRole | null>(null);
  const [loading, setLoading] = React.useState(supabase !== null);

  React.useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Role comes from public.profiles (RLS: a user can read only their own row).
  const userId = session?.user.id;
  React.useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()
      .then(({ data }) => !cancelled && setRole((data?.role as UserRole) ?? "customer"));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      available: supabase !== null,
      loading,
      session,
      role: session ? role : null,
      signIn: async (email, password) => {
        if (!supabase) return "unavailable";
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error?.message ?? null;
      },
      signUp: async ({ email, password, fullName, role: wanted, locale }) => {
        if (!supabase) return { error: "unavailable", needsConfirmation: false };
        // The handle_new_user() trigger turns these metadata fields into the profile row;
        // 'admin' is never accepted from the client.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role: wanted, full_name: fullName, locale } },
        });
        return { error: error?.message ?? null, needsConfirmation: !error && !data.session };
      },
      signOut: async () => {
        await supabase?.auth.signOut();
        setRole(null);
      },
    }),
    [loading, session, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
