"use client";

import { useEffect, useMemo, useState } from "react";
import { PRIMARY_OWNER_NAME, PRIMARY_OWNER_UID } from "@/lib/app-config";
import { getUserDisplayName } from "@/lib/auth";
import { getCountryFlagUrl, getDisplayCountryName } from "@/lib/country-flags";
import { supabase } from "@/lib/supabase";
import type { Stage } from "@/lib/types";
import { useAuthUser } from "@/hooks/use-auth-user";

type Toast = {
  id: number;
  message: string;
  type: "success" | "error";
};

type AdminPlayer = {
  memberId: string;
  userId: string;
  name: string;
};

type AdminMatch = {
  id: string;
  stage: Stage;
  matchNumber: number | null;
  kickoffAt: string;
  venue: string;
  status: string;
  home: string;
  away: string;
};

type AdminPrediction = {
  id: string | null;
  memberId: string;
  matchId: string;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  predictedPenaltyWinner: "home" | "away" | null;
  totalPoints: number | null;
  bonusPoints: number | null;
};

type Draft = {
  home: string;
  away: string;
  penaltyWinner: "" | "home" | "away";
};

const STAGE_OPTIONS: Array<{ value: "all" | Stage; label: string }> = [
  { value: "all", label: "Todas las fases" },
  { value: "group", label: "Fase de grupos" },
  { value: "round_of_32", label: "Dieciseisavos" },
  { value: "round_of_16", label: "Octavos" },
  { value: "quarter_final", label: "Cuartos" },
  { value: "semi_final", label: "Semifinales" },
  { value: "final", label: "Final" },
];

function formatStageLabel(stage: Stage) {
  const labels: Record<Stage, string> = {
    group: "Fase de grupos",
    round_of_32: "Dieciseisavos",
    round_of_16: "Octavos",
    quarter_final: "Cuartos",
    semi_final: "Semifinales",
    third_place: "Tercer lugar",
    final: "Final",
  };

  return labels[stage] ?? stage;
}

function formatMatchDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(date);
}

function getPredictionKey(memberId: string, matchId: string) {
  return `${memberId}::${matchId}`;
}

export function AdminPredictionOverridesPanel() {
  const { user } = useAuthUser();
  const currentUserName = getUserDisplayName(user);
  const isPrimaryOwner =
    user?.id === PRIMARY_OWNER_UID ||
    currentUserName?.trim().toLowerCase() === PRIMARY_OWNER_NAME.toLowerCase();

  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [predictions, setPredictions] = useState<Record<string, AdminPrediction>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedStage, setSelectedStage] = useState<"all" | Stage>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const client = supabase;

    if (!user || !isPrimaryOwner || !client) {
      return;
    }

    const supabaseClient = client;

    let active = true;

    async function loadAdminPredictions() {
      setLoading(true);

      try {
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();

        const accessToken = session?.access_token;
        if (!accessToken) {
          throw new Error("Tu sesión admin no está disponible.");
        }

        const response = await fetch("/api/admin/prediction-overrides", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const payload = (await response.json().catch(() => null)) as
          | {
              players?: AdminPlayer[];
              matches?: AdminMatch[];
              predictions?: AdminPrediction[];
              error?: string;
            }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "No se pudieron cargar los pronósticos admin.");
        }

        if (!active) {
          return;
        }

        const nextPlayers = payload?.players ?? [];
        const nextMatches = (payload?.matches ?? []).map((match) => ({
          ...match,
          home: getDisplayCountryName(match.home),
          away: getDisplayCountryName(match.away),
        }));
        const predictionMap = Object.fromEntries(
          (payload?.predictions ?? []).map((prediction) => [
            getPredictionKey(prediction.memberId, prediction.matchId),
            prediction,
          ]),
        );
        const nextDrafts = Object.fromEntries(
          (payload?.predictions ?? []).map((prediction) => [
            getPredictionKey(prediction.memberId, prediction.matchId),
            {
              home: prediction.predictedHomeScore?.toString() ?? "",
              away: prediction.predictedAwayScore?.toString() ?? "",
              penaltyWinner: prediction.predictedPenaltyWinner ?? "",
            } satisfies Draft,
          ]),
        );

        setPlayers(nextPlayers);
        setMatches(nextMatches);
        setPredictions(predictionMap);
        setDrafts(nextDrafts);
        setSelectedMemberId((current) => current || nextPlayers[0]?.memberId || "");
      } catch (error) {
        if (!active) {
          return;
        }

        showToast(error instanceof Error ? error.message : "No se pudieron cargar los pronósticos admin.", "error");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAdminPredictions();

    return () => {
      active = false;
    };
  }, [isPrimaryOwner, user]);

  function showToast(message: string, type: Toast["type"]) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, type }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }

  const filteredMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return matches.filter((match) => {
      if (selectedStage !== "all" && match.stage !== selectedStage) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        match.home.toLowerCase().includes(query) ||
        match.away.toLowerCase().includes(query) ||
        formatStageLabel(match.stage).toLowerCase().includes(query) ||
        match.venue.toLowerCase().includes(query)
      );
    });
  }, [matches, searchQuery, selectedStage]);

  function getDraft(memberId: string, matchId: string) {
    const key = getPredictionKey(memberId, matchId);
    return drafts[key] ?? { home: "", away: "", penaltyWinner: "" };
  }

  function updateDraft(memberId: string, matchId: string, patch: Partial<Draft>) {
    const key = getPredictionKey(memberId, matchId);
    setDrafts((current) => ({
      ...current,
      [key]: {
        ...getDraft(memberId, matchId),
        ...patch,
      },
    }));
  }

  async function savePredictionForMatch(match: AdminMatch) {
    const client = supabase;

    if (!client || !selectedMemberId) {
      showToast("Selecciona primero un jugador.", "error");
      return;
    }

    const supabaseClient = client;

    const key = getPredictionKey(selectedMemberId, match.id);
    const draft = getDraft(selectedMemberId, match.id);

    if (draft.home === "" || draft.away === "") {
      showToast("Ingresa ambos marcadores antes de guardar.", "error");
      return;
    }

    if (!/^\d+$/.test(draft.home) || !/^\d+$/.test(draft.away)) {
      showToast("Los marcadores deben ser números enteros.", "error");
      return;
    }

    if (draft.home === draft.away && !draft.penaltyWinner && match.stage !== "group") {
      showToast("Si hay empate en fase KO, elige el ganador por penales.", "error");
      return;
    }

    setSavingKey(key);

    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Tu sesión admin no está disponible.");
      }

      const response = await fetch("/api/admin/prediction-overrides", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          memberId: selectedMemberId,
          matchId: match.id,
          predictedHomeScore: Number(draft.home),
          predictedAwayScore: Number(draft.away),
          predictedPenaltyWinner:
            Number(draft.home) === Number(draft.away) && match.stage !== "group"
              ? draft.penaltyWinner || null
              : null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { prediction?: AdminPrediction; error?: string }
        | null;

      if (!response.ok || !payload?.prediction) {
        throw new Error(payload?.error ?? "No se pudo guardar el pronóstico manual.");
      }

      setPredictions((current) => ({
        ...current,
        [key]: payload.prediction!,
      }));
      showToast("Pronóstico guardado desde admin.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo guardar el pronóstico manual.", "error");
    } finally {
      setSavingKey(null);
    }
  }

  if (!isPrimaryOwner) {
    return (
      <section
        className="rounded-[2rem] p-6"
        style={{
          border: "1px solid var(--color-border-accent)",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          boxShadow: "0 24px 56px rgba(0, 0, 0, 0.22)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
          Solo Luisa puede editar pronósticos manualmente desde admin.
        </p>
      </section>
    );
  }

  return (
    <>
      <section
        className="rounded-[2rem] p-6"
        style={{
          border: "1px solid var(--color-border-accent)",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          boxShadow: "0 24px 56px rgba(0, 0, 0, 0.22)",
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--color-text-subtle)" }}>
              Admin tools
            </p>
            <h2 className="text-3xl font-black text-white">Carga manual de pronósticos</h2>
          </div>
          <p className="max-w-2xl text-sm" style={{ color: "var(--color-text-subtle)" }}>
            Aquí puedes guardar pronósticos para cualquier jugador aunque el partido ya esté bloqueado por kickoff.
          </p>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
              Jugador
            </span>
            <select
              value={selectedMemberId}
              onChange={(event) => setSelectedMemberId(event.target.value)}
              className="rounded-2xl px-4 py-3 text-sm outline-none"
              style={{
                border: "1px solid var(--color-border-accent)",
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "var(--color-text)",
              }}
            >
              {players.map((player) => (
                <option key={player.memberId} value={player.memberId}>
                  {player.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
              Fase
            </span>
            <select
              value={selectedStage}
              onChange={(event) => setSelectedStage(event.target.value as "all" | Stage)}
              className="rounded-2xl px-4 py-3 text-sm outline-none"
              style={{
                border: "1px solid var(--color-border-accent)",
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "var(--color-text)",
              }}
            >
              {STAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
              Buscar
            </span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="País, fase o sede"
              className="rounded-2xl px-4 py-3 text-sm outline-none"
              style={{
                border: "1px solid var(--color-border-accent)",
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "var(--color-text)",
              }}
            />
          </label>
        </div>

        <div className="mt-6 grid gap-3">
          {loading ? (
            <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
              Cargando panel admin de pronósticos...
            </p>
          ) : filteredMatches.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
              No hay partidos que coincidan con este filtro.
            </p>
          ) : (
            filteredMatches.map((match) => {
              const draft = selectedMemberId ? getDraft(selectedMemberId, match.id) : { home: "", away: "", penaltyWinner: "" };
              const predictionKey = selectedMemberId ? getPredictionKey(selectedMemberId, match.id) : "";
              const existingPrediction = predictionKey ? predictions[predictionKey] : null;
              const requiresPenalties = match.stage !== "group" && draft.home !== "" && draft.home === draft.away;
              const homeFlag = getCountryFlagUrl(match.home);
              const awayFlag = getCountryFlagUrl(match.away);
              const existingPredictionLabel = existingPrediction
                ? `${existingPrediction.predictedHomeScore ?? "-"}-${existingPrediction.predictedAwayScore ?? "-"}${
                    existingPrediction.predictedPenaltyWinner === "home"
                      ? ` · penales ${match.home}`
                      : existingPrediction.predictedPenaltyWinner === "away"
                        ? ` · penales ${match.away}`
                        : ""
                  }`
                : null;

              return (
                <article
                  key={match.id}
                  className="rounded-[1.6rem] p-4"
                  style={{
                    border: "1px solid var(--color-border-accent)",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--color-text-subtle)" }}>
                        {formatStageLabel(match.stage)}{match.matchNumber ? ` · #${match.matchNumber}` : ""}
                      </p>
                      <p className="mt-1 text-sm" style={{ color: "var(--color-text-subtle)" }}>
                        {formatMatchDate(match.kickoffAt)} · {match.venue}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-lg font-black text-white">
                        <span className="inline-flex items-center gap-2">
                          {homeFlag ? <img src={homeFlag} alt="" className="h-5 w-7 rounded-sm object-cover" /> : null}
                          {match.home}
                        </span>
                        <span style={{ color: "var(--color-text-subtle)" }}>vs</span>
                        <span className="inline-flex items-center gap-2">
                          {awayFlag ? <img src={awayFlag} alt="" className="h-5 w-7 rounded-sm object-cover" /> : null}
                          {match.away}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                        style={{
                          border: "1px solid rgba(255,255,255,0.12)",
                          backgroundColor: "rgba(255,255,255,0.08)",
                          color: "var(--color-text-subtle)",
                        }}
                      >
                        {match.status}
                      </span>
                      {existingPrediction ? (
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                          style={{
                            border: "1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)",
                            backgroundColor: "color-mix(in srgb, var(--color-accent) 18%, rgba(255,255,255,0.08))",
                            color: "var(--color-text)",
                          }}
                        >
                          Ya cargado
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {existingPrediction ? (
                    <div
                      className="mt-4 rounded-2xl px-4 py-3 text-sm"
                      style={{
                        border: "1px solid rgba(255,255,255,0.1)",
                        backgroundColor: "rgba(255,255,255,0.03)",
                        color: "var(--color-text-subtle)",
                      }}
                    >
                      <p className="font-semibold text-white">Pronóstico guardado actualmente</p>
                      <p className="mt-1">
                        {existingPredictionLabel}
                        {existingPrediction.totalPoints !== null
                          ? ` · ${existingPrediction.totalPoints} pts`
                          : ""}
                        {existingPrediction.bonusPoints
                          ? ` · bonus ${existingPrediction.bonusPoints}`
                          : ""}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-subtle)" }}>
                        Local
                      </span>
                      <input
                        value={draft.home}
                        onChange={(event) => updateDraft(selectedMemberId, match.id, { home: event.target.value.replace(/[^\d]/g, "") })}
                        inputMode="numeric"
                        className="w-24 rounded-2xl px-4 py-3 text-center text-lg font-black outline-none"
                        style={{
                          border: "1px solid var(--color-border-accent)",
                          backgroundColor: "rgba(255,255,255,0.06)",
                          color: "var(--color-text)",
                        }}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-subtle)" }}>
                        Visitante
                      </span>
                      <input
                        value={draft.away}
                        onChange={(event) => updateDraft(selectedMemberId, match.id, { away: event.target.value.replace(/[^\d]/g, "") })}
                        inputMode="numeric"
                        className="w-24 rounded-2xl px-4 py-3 text-center text-lg font-black outline-none"
                        style={{
                          border: "1px solid var(--color-border-accent)",
                          backgroundColor: "rgba(255,255,255,0.06)",
                          color: "var(--color-text)",
                        }}
                      />
                    </label>

                    {requiresPenalties ? (
                      <label className="grid gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-subtle)" }}>
                          Gana en penales
                        </span>
                        <select
                          value={draft.penaltyWinner}
                          onChange={(event) =>
                            updateDraft(selectedMemberId, match.id, {
                              penaltyWinner: event.target.value as "" | "home" | "away",
                            })
                          }
                          className="rounded-2xl px-4 py-3 text-sm outline-none"
                          style={{
                            border: "1px solid var(--color-border-accent)",
                            backgroundColor: "rgba(255,255,255,0.06)",
                            color: "var(--color-text)",
                          }}
                        >
                          <option value="">Elegir ganador</option>
                          <option value="home">{match.home}</option>
                          <option value="away">{match.away}</option>
                        </select>
                      </label>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        void savePredictionForMatch(match);
                      }}
                      disabled={!selectedMemberId || savingKey === predictionKey}
                      className="rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        border: "1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)",
                        backgroundColor: "color-mix(in srgb, var(--color-accent) 16%, rgba(255,255,255,0.08))",
                        color: "var(--color-text)",
                      }}
                    >
                      {savingKey === predictionKey ? "Guardando..." : "Guardar override"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-2xl px-4 py-3 text-sm shadow-lg"
            style={{
              backgroundColor: toast.type === "success" ? "rgba(22, 163, 74, 0.94)" : "rgba(220, 38, 38, 0.92)",
              color: "white",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
