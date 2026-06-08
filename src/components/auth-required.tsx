"use client";

import type { ReactNode } from "react";
import LoginPageClient from "@/components/login-page-client";
import { useAuthUser } from "@/hooks/use-auth-user";

export function AuthRequired({ children }: { children: ReactNode }) {
  const { loading, user } = useAuthUser();

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-slate-900/80 p-8">
          <p className="text-sm text-slate-300">Checking your session...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return <LoginPageClient />;
  }

  return <>{children}</>;
}
