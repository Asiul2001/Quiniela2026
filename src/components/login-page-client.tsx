"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  getUserDisplayName,
  signInWithNamePassword,
  signOutUser,
  signUpWithNamePassword,
} from "@/lib/auth";
import { normalizeAccessCode } from "@/lib/access-codes";
import { hasSupabaseEnv } from "@/lib/supabase";
import { useAuthUser } from "@/hooks/use-auth-user";

function LoginPageClient() {
  const router = useRouter();
  const { loading, user } = useAuthUser();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedAccessCode, setGeneratedAccessCode] = useState<string | null>(null);
  const [copiedGeneratedCode, setCopiedGeneratedCode] = useState(false);

  useEffect(() => {
    if (!loading && user && !generatedAccessCode) {
      router.replace("/");
    }
  }, [generatedAccessCode, loading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Enter a name to continue.");
      setSuccess(null);
      return;
    }

    if (mode === "sign-in" && !password) {
      setError("Enter your 4-character access code to continue.");
      setSuccess(null);
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "sign-up") {
        const createdAccount = await signUpWithNamePassword(trimmedName);
        setGeneratedAccessCode(createdAccount.accessCode);
        setCopiedGeneratedCode(false);
        setSuccess(`Account created for ${createdAccount.user.user_metadata?.display_name ?? trimmedName}.`);
      } else {
        const signedInUser = await signInWithNamePassword(trimmedName, normalizeAccessCode(password));
        setSuccess(`Welcome back, ${signedInUser.user_metadata?.display_name ?? trimmedName}.`);
      }

      setPassword("");
      if (mode === "sign-in") {
        router.push("/");
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to complete sign-in.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  async function handleLogout() {
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      await signOutUser();
      setSuccess("Logged out successfully.");
      router.refresh();
    } catch (logoutError) {
      const message = logoutError instanceof Error ? logoutError.message : "Unable to log out.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  async function copyGeneratedCode() {
    if (!generatedAccessCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedAccessCode);
      setCopiedGeneratedCode(true);
    } catch {
      setError("Could not copy the access code automatically. Please write it down manually.");
    }
  }

  function dismissGeneratedCodeModal() {
    setGeneratedAccessCode(null);
    setCopiedGeneratedCode(false);
    router.push("/");
  }

  const displayName = getUserDisplayName(user);

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12 sm:px-8 lg:px-10">
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="mb-8 flex flex-col gap-3">
            <p className="text-sm uppercase tracking-[0.28em] text-sky-400">Login</p>
            <h1 className="text-4xl font-black text-white sm:text-5xl">Sign in with your name and access code</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">
              This version uses real Supabase accounts behind the scenes while keeping the simple family-friendly name and access-code flow.
            </p>
            <p className="max-w-2xl text-sm leading-7 text-slate-400">
              Every player signs in with a 4-character code using only capital letters and numbers. New accounts get that code generated automatically.
            </p>
          </div>

          {!hasSupabaseEnv ? (
            <p className="rounded-3xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
              Supabase env vars are missing, so authentication is unavailable in this environment.
            </p>
          ) : null}

          <div className="mb-6 inline-flex rounded-full border border-white/10 bg-slate-950/70 p-1">
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className="rounded-full px-4 py-2 text-sm font-medium transition"
              style={{
                backgroundColor: mode === "sign-in" ? "rgba(14, 165, 233, 0.2)" : "transparent",
                color: mode === "sign-in" ? "white" : "rgb(203, 213, 225)",
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("sign-up")}
              className="rounded-full px-4 py-2 text-sm font-medium transition"
              style={{
                backgroundColor: mode === "sign-up" ? "rgba(14, 165, 233, 0.2)" : "transparent",
                color: mode === "sign-up" ? "white" : "rgb(203, 213, 225)",
              }}
            >
              Create account
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">Name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-4 text-base text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                placeholder="Enter your name"
                autoComplete="username"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">
                {mode === "sign-in" ? "Access code" : "Access code"}
              </span>
              {mode === "sign-in" ? (
                <input
                  type="text"
                  value={password}
                  onChange={(event) => setPassword(normalizeAccessCode(event.target.value).slice(0, 4))}
                  className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-4 text-base font-semibold uppercase tracking-[0.28em] text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                  placeholder="ENTER CODE"
                  autoComplete="one-time-code"
                  maxLength={4}
                />
              ) : (
                <div className="rounded-3xl border border-dashed border-sky-400/30 bg-slate-950/70 px-4 py-4 text-sm leading-7 text-slate-300">
                  A 4-character access code will be generated automatically after account creation. It will use only capital letters and numbers.
                </div>
              )}
            </label>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={!hasSupabaseEnv || pending}
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Working..." : mode === "sign-up" ? "Create account" : "Continue"}
              </button>
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={pending}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-slate-200 transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Log out
                </button>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-3xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <p>{error}</p>
                {mode === "sign-in" ? (
                  <p className="mt-2 text-red-100/90">
                    If you expected a seeded user like <span className="font-semibold">Luisa</span> with code <span className="font-semibold">2569</span> to work, that seed has probably not been applied to the currently configured Supabase project.
                  </p>
                ) : null}
              </div>
            ) : null}
            {success ? <p className="rounded-3xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</p> : null}
          </form>

          {loading ? (
            <div className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6">
              <p className="text-sm text-slate-300">Checking your session...</p>
            </div>
          ) : null}

          {user ? (
            <div className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Logged in as</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{displayName}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Your predictions and membership now map to your real Supabase account instead of a browser-only user.
              </p>
            </div>
          ) : null}
        </section>
      </div>

      {generatedAccessCode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6">
          <div className="w-full max-w-lg rounded-[2rem] border border-sky-400/20 bg-slate-900 p-8 shadow-2xl shadow-black/40">
            <p className="text-sm uppercase tracking-[0.28em] text-sky-400">Access code</p>
            <h2 className="mt-3 text-3xl font-black text-white">Save this code now</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              This code will not disappear until you copy it or click okay. You will use it to log in next time.
            </p>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-950/80 px-5 py-6 text-center">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">4-character code</p>
              <p className="mt-3 text-5xl font-black tracking-[0.34em] text-white">{generatedAccessCode}</p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  void copyGeneratedCode();
                }}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                {copiedGeneratedCode ? "Copied" : "Copy code"}
              </button>
              <button
                type="button"
                onClick={dismissGeneratedCodeModal}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-sky-400"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default LoginPageClient;
