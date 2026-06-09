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
  const [holdSignupCodeModal, setHoldSignupCodeModal] = useState(false);

  useEffect(() => {
    if (!loading && user && !generatedAccessCode && !holdSignupCodeModal) {
      router.replace("/");
    }
  }, [generatedAccessCode, holdSignupCodeModal, loading, router, user]);

  useEffect(() => {
  const savedCode = sessionStorage.getItem("pendingAccessCode");

  if (savedCode) {
    setGeneratedAccessCode(savedCode);
    setCopiedGeneratedCode(false);
    setHoldSignupCodeModal(true);
  }
}, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Ingresa tu nombre para continuar");
      setSuccess(null);
      return;
    }

    if (mode === "sign-in" && !normalizeAccessCode(password).replace(/\s/g, "")) {
      setError("Ingresa tu código de acceso de 4 caracteres para continuar.");
      setSuccess(null);
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
if (mode === "sign-up") {
  const createdAccount = await signUpWithNamePassword(trimmedName);

  sessionStorage.setItem(
    "pendingAccessCode",
    createdAccount.accessCode,
  );

  setGeneratedAccessCode(createdAccount.accessCode);
  setCopiedGeneratedCode(false);
  setHoldSignupCodeModal(true);

  await signOutUser();

  setSuccess(
    `Account created for ${
      createdAccount.user.user_metadata?.display_name ?? trimmedName
    }. Save the code and then log in.`,
  );
} else {
  await signInWithNamePassword(trimmedName, password);
}
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "No se pudo completar el sign-in.";
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
      setSuccess("Logout exitoso");
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
      setError("No se pudo copiar el código, por favor cópialo manualmente.");
    }
  }

  function dismissGeneratedCodeModal() {
    sessionStorage.removeItem("pendingAccessCode");
    setGeneratedAccessCode(null);
    setCopiedGeneratedCode(false);
    setHoldSignupCodeModal(false);
    setMode("sign-in");
    setPassword("");
    router.push("/login");
  }

  const displayName = getUserDisplayName(user);
  

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12 sm:px-8 lg:px-10">
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="mb-8 flex flex-col gap-3">
            <p className="text-sm uppercase tracking-[0.28em] text-sky-400">Login</p>
            <h1 className="text-4xl font-black text-white sm:text-5xl">Ingresa con tu nombre y código de 4 dígitos</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">
              Esta versión utiliza autenticación basada en Supabase, lo que significa que cada jugador tiene una cuenta única que se puede usar para acceder a sus predicciones desde cualquier dispositivo. No es solo para guardar tus predicciones en el navegador, sino para que puedas acceder a ellas donde quieras.
            </p>
            <p className="max-w-2xl text-sm leading-7 text-slate-400">
              Cada jugador debe crear su propia cuenta usando un nombre y un código de acceso único de 4 caracteres. Si ya tienes una cuenta, simplemente ingresa tu nombre y código para acceder a tus predicciones.
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
              Crear cuenta
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">Nombre</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-4 text-base text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                placeholder="Ingresa tu nombre"
                autoComplete="username"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">
                {mode === "sign-in" ? "Código de acceso" : "Código de acceso (generado automáticamente después de crear la cuenta)"}
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
                  Un código de acceso de 4 caracteres se generará automáticamente después de crear la cuenta. Solo se usarán letras mayúsculas y números.
                </div>
              )}
            </label>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={!hasSupabaseEnv || pending}
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Working..." : mode === "sign-up" ? "Crear cuenta" : "Continuar"}
              </button>
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={pending}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-slate-200 transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cerrar sesión
                </button>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-3xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <p>{error}</p>
                {mode === "sign-in" ? (
                  <p className="mt-2 text-red-100/90">
                    Código de acceso incorrecto. Por favor, inténtalo de nuevo.
                  </p>
                ) : null}
              </div>
            ) : null}
            {success ? <p className="rounded-3xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</p> : null}
          </form>

          {loading ? (
            <div className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/80 p-6">
              <p className="text-sm text-slate-300">Verificando tu sesión...</p>
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
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-6">
    <div className="w-full max-w-xl rounded-[2rem] border border-yellow-400/40 bg-slate-900 p-8 shadow-2xl shadow-black/40">
      <p className="text-sm uppercase tracking-[0.28em] text-yellow-300">
        Importante — guarda tu código
      </p>

      <h2 className="mt-3 text-4xl font-black text-white">
        Este es tu código de acceso
      </h2>

      <p className="mt-4 text-base leading-7 text-slate-200">
        Necesitarás este código para acceder a tus predicciones en el futuro. Asegúrate de guardarlo en un lugar seguro o cópialo ahora.
      </p>

      <div className="mt-6 rounded-[1.5rem] border-2 border-yellow-400/50 bg-slate-950 px-5 py-7 text-center">
        <p className="text-xs uppercase tracking-[0.26em] text-yellow-300">
          Tu código de acceso es
        </p>

        <p className="mt-4 select-all text-6xl font-black tracking-[0.34em] text-white">
              {generatedAccessCode}
            </p>
          </div>

          <div className="mt-5 rounded-2xl bg-yellow-400/10 px-4 py-3 text-sm leading-6 text-yellow-100">
            Si olvidas el código, sólo pregúntale a el administrador de la quiniela para que te lo recuerde. No hay forma de restablecerlo por tu cuenta, así que guárdalo bien.
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                void copyGeneratedCode();
              }}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-yellow-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-yellow-300"
            >
              {copiedGeneratedCode ? "Code copied" : "Copy code"}
            </button>

            <button
              type="button"
              onClick={dismissGeneratedCodeModal}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Guardé mi código
            </button>
          </div>

          {!copiedGeneratedCode ? (
            <p className="mt-3 text-center text-xs text-slate-400">
              Copia el código o haz click en "Guardé mi código" para continuar
            </p>
          ) : null}
        </div>
      </div>
    ) : null}
    </main>
  );
}

export default LoginPageClient;
