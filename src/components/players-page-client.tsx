"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ThemeMascotOverlay } from "@/components/theme-mascot-overlay";
import { useAuthUser } from "@/hooks/use-auth-user";
import { PRIMARY_LEAGUE_NAME } from "@/lib/app-config";
import { getCountryFlagUrl } from "@/lib/country-flags";
import { supabase } from "@/lib/supabase";

type PlayerSummary = {
  id: string;
  userId: string;
  name: string;
  points: number;
  completion: number;
  predictionsCount: number;
  breakdown?: {
    matchPoints: number;
    extraPoints: number;
    darkHorsePoints: number;
    projectionPoints: number;
  };
};

type PlayerPrediction = {
  matchId: string;
  home: string;
  away: string;
  predictedHome: number | null;
  predictedAway: number | null;
  actualHome: number | null;
  actualAway: number | null;
  stage: string;
  kickoffAt: string;
  venue: string;
  status: string;
  points: number;
  bonusPoints?: number;
};

type PlayerExtraPoint = {
  id: string;
  label: string;
  detail: string;
  points: number;
  category: "dark_horse" | "projection_bonus";
  kickoffAt?: string | null;
};

function formatLocalMatchTime(kickoffAt: string) {
  const kickoff = new Date(kickoffAt);

  return {
    date: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(kickoff),
    time: new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(kickoff),
  };
}

function formatPredictionValue(home: number | null, away: number | null, emptyLabel = "—") {
  if (home === null || away === null) {
    return emptyLabel;
  }

  return `${home}-${away}`;
}

function formatStageLabel(stage: string) {
  const labels: Record<string, string> = {
    group: "Grupos",
    round_of_32: "Dieciseisavos",
    round_of_16: "Octavos",
    quarter_final: "Cuartos",
    semi_final: "Semifinal",
    third_place: "Tercer lugar",
    final: "Final",
  };

  return labels[stage] ?? stage;
}

export function PlayersPageClient() {
  const { user } = useAuthUser();
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [playerPredictions, setPlayerPredictions] = useState<Record<string, PlayerPrediction[]>>({});
  const [playerExtraPoints, setPlayerExtraPoints] = useState<Record<string, PlayerExtraPoint[]>>({});
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    async function loadPlayerData() {
      try {
        if (!supabase) {
          throw new Error("Supabase is not configured for this environment.");
        }

        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;

        if (!accessToken) {
          throw new Error("Unable to resolve your session token.");
        }

        const response = await fetch("/api/players/browse", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to load league players.");
        }

        if (!active) {
          return;
        }

        setLeagueId(payload.leagueId);
        setPlayers(payload.players ?? []);
        setPlayerPredictions(payload.playerPredictions ?? {});
        setPlayerExtraPoints(payload.playerExtraPoints ?? {});
        setSelectedPlayerId((current) => current ?? payload.players?.[0]?.id ?? null);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Unable to load player predictions.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPlayerData();

    return () => {
      active = false;
    };
  }, [user]);

  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? players[0] ?? null,
    [players, selectedPlayerId],
  );

  const selectedPredictions = useMemo(() => {
    if (!selectedPlayer) {
      return [];
    }

    return (playerPredictions[selectedPlayer.id] ?? []).sort(
      (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
    );
  }, [playerPredictions, selectedPlayer]);

  const selectedExtraPoints = useMemo(() => {
    if (!selectedPlayer) {
      return [];
    }

    return (playerExtraPoints[selectedPlayer.id] ?? []).sort((a, b) => {
      const left = a.kickoffAt ? new Date(a.kickoffAt).getTime() : Number.MAX_SAFE_INTEGER;
      const right = b.kickoffAt ? new Date(b.kickoffAt).getTime() : Number.MAX_SAFE_INTEGER;
      return left - right;
    });
  }, [playerExtraPoints, selectedPlayer]);

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundColor: "var(--color-primary)",
        color: "var(--color-text)",
      }}
    >
      <ThemeMascotOverlay />
      <div
        className="absolute inset-0 -z-10"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p
              className="text-xs uppercase tracking-[0.28em]"
              style={{ color: "var(--color-accent)" }}
            >
              Ranking de jugadores
            </p>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">Miembros de la liga</h1>
            <p
              className="mt-3 max-w-2xl text-sm leading-7"
              style={{ color: "var(--color-text-subtle)" }}
            >
              Compara los puntos actuales y revisa con transparencia de dónde sale cada uno:
              partidos, cruces proyectados, avances y dark horse.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
              style={{
                border: "1px solid var(--color-border-accent)",
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                color: "var(--color-text)",
              }}
            >
              Regresar a Home
            </Link>
            <Link
              href="/predictions"
              className="rounded-full px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
              style={{
                border: "1px solid color-mix(in srgb, var(--color-accent) 45%, transparent)",
                backgroundColor:
                  "color-mix(in srgb, var(--color-accent) 14%, rgba(255, 255, 255, 0.06))",
                color: "var(--color-text)",
              }}
            >
              Rellenar mis predicciones
            </Link>
          </div>
        </div>

        {loading ? (
          <div
            className="rounded-[2rem] p-8 text-center"
            style={{
              border: "1px solid var(--color-border-accent)",
              backgroundColor: "var(--color-bg-card)",
              color: "var(--color-text-subtle)",
            }}
          >
            Cargando datos de jugadores...
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-rose-500 bg-rose-500/10 p-8 text-slate-100">
            <p className="font-semibold">No se pudo cargar.</p>
            <p className="mt-2 text-sm text-slate-300">{error}</p>
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="space-y-5">
              <div
                className="rounded-[2rem] p-6"
                style={{
                  border: "1px solid var(--color-border-accent)",
                  backgroundColor: "var(--color-bg-card)",
                  boxShadow: "0 28px 70px rgba(0, 0, 0, 0.24)",
                }}
              >
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p
                      className="text-sm uppercase tracking-[0.24em]"
                      style={{ color: "var(--color-text-subtle)" }}
                    >
                      Jugadores de la liga
                    </p>
                    <p className="mt-2 text-2xl font-black">{players.length} Miembros en la liga</p>
                  </div>
                  <div
                    className="rounded-2xl px-4 py-3 text-sm sm:max-w-xs"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                      color: "var(--color-text-subtle)",
                    }}
                  >
                    Nombre de la liga: {PRIMARY_LEAGUE_NAME ?? leagueId ?? "—"}
                  </div>
                </div>

                <div className="space-y-3">
                  {players.map((player, index) => {
                    const isSelected = player.id === selectedPlayer?.id;

                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => setSelectedPlayerId(player.id)}
                        className="w-full rounded-[1.75rem] border px-4 py-4 text-left transition duration-200 hover:-translate-y-0.5"
                        style={{
                          borderColor: isSelected
                            ? "var(--color-accent)"
                            : "var(--color-border-accent)",
                          backgroundColor: isSelected
                            ? "color-mix(in srgb, var(--color-accent) 14%, rgba(255,255,255,0.06))"
                            : "rgba(255, 255, 255, 0.05)",
                          color: "var(--color-text)",
                        }}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3">
                            <p
                              className="min-w-[2.75rem] text-xl font-black sm:text-2xl"
                              style={{ color: "var(--color-accent)" }}
                            >
                              #{index + 1}
                            </p>
                            <div className="min-w-0">
                              <p className="break-words text-base font-semibold sm:text-lg">
                                {player.name}
                              </p>
                              <p
                                className="mt-1 text-sm"
                                style={{ color: "var(--color-text-subtle)" }}
                              >
                                Predicciones guardadas: {player.predictionsCount}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-end justify-between gap-4 sm:block sm:text-right">
                            <div>
                              <p className="text-2xl font-black">{player.points}</p>
                              <p
                                className="text-[11px] uppercase tracking-[0.18em]"
                                style={{ color: "var(--color-text-subtle)" }}
                              >
                                puntos
                              </p>
                            </div>
                            <p
                              className="text-xs uppercase tracking-[0.18em] sm:mt-1"
                              style={{ color: "var(--color-text-subtle)" }}
                            >
                              {player.completion}% completado
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div
                className="rounded-[2rem] p-6"
                style={{
                  border: "1px solid var(--color-border-accent)",
                  backgroundColor: "var(--color-bg-card)",
                  boxShadow: "0 28px 70px rgba(0, 0, 0, 0.24)",
                }}
              >
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p
                      className="text-sm uppercase tracking-[0.24em]"
                      style={{ color: "var(--color-text-subtle)" }}
                    >
                      Jugador seleccionado
                    </p>
                    <p className="mt-2 break-words text-3xl font-black">
                      {selectedPlayer?.name ?? "Sin jugador seleccionado"}
                    </p>
                  </div>
                  <div
                    className="rounded-2xl px-4 py-3 text-sm sm:max-w-xs"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                      color: "var(--color-text-subtle)",
                    }}
                  >
                    {selectedPlayer
                      ? `${selectedPlayer.points} puntos · ${selectedPlayer.completion}% completado`
                      : "Elige un jugador"}
                  </div>
                </div>

                {selectedPlayer?.breakdown ? (
                  <div className="mb-6 grid gap-3 md:grid-cols-4">
                    {[
                      ["Puntos de partidos", selectedPlayer.breakdown.matchPoints],
                      ["Puntos extra", selectedPlayer.breakdown.extraPoints],
                      ["Dark Horse", selectedPlayer.breakdown.darkHorsePoints],
                      ["Cruces y avances", selectedPlayer.breakdown.projectionPoints],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-2xl px-4 py-4"
                        style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                      >
                        <p
                          className="text-[11px] uppercase tracking-[0.18em]"
                          style={{ color: "var(--color-text-subtle)" }}
                        >
                          {label}
                        </p>
                        <p className="mt-2 text-2xl font-black">{value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div
                  className="mb-6 rounded-[1.75rem] p-4"
                  style={{
                    border: "1px solid var(--color-border-accent)",
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p
                        className="text-xs uppercase tracking-[0.18em]"
                        style={{ color: "var(--color-text-subtle)" }}
                      >
                        Puntos extra
                      </p>
                      <p className="mt-1 text-xl font-black">De dónde salen</p>
                    </div>
                    <div
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{
                        border: "1px solid var(--color-border-accent)",
                        backgroundColor: "rgba(255,255,255,0.06)",
                        color: "var(--color-text-subtle)",
                      }}
                    >
                      {selectedExtraPoints.reduce((sum, item) => sum + item.points, 0)} pts
                    </div>
                  </div>

                  {selectedExtraPoints.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                      Todavía no hay puntos extra acumulados para este jugador.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedExtraPoints.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-2 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                        >
                          <div className="min-w-0">
                            <p className="font-semibold">{item.label}</p>
                            <p className="mt-1 text-sm" style={{ color: "var(--color-text-subtle)" }}>
                              {item.detail}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black">+{item.points}</p>
                            <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
                              extra
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className="overflow-hidden rounded-[1.75rem]"
                  style={{
                    border: "1px solid var(--color-border-accent)",
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  {selectedPredictions.length === 0 ? (
                    <div
                      className="px-4 py-8 text-center text-sm"
                      style={{ color: "var(--color-text-subtle)" }}
                    >
                      Este jugador no ha guardado ninguna predicción todavía.
                    </div>
                  ) : (
                    <>
                      <div className="divide-y md:hidden" style={{ borderColor: "var(--color-border-accent)" }}>
                        {selectedPredictions.map((prediction) => {
                          const kickoff = formatLocalMatchTime(prediction.kickoffAt);
                          const actualResult = formatPredictionValue(
                            prediction.actualHome,
                            prediction.actualAway,
                            "Sin resultado",
                          );
                          const predictedResult = formatPredictionValue(
                            prediction.predictedHome,
                            prediction.predictedAway,
                          );

                          return (
                            <article key={prediction.matchId} className="space-y-4 px-4 py-5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <p
                                    className="text-xs uppercase tracking-[0.18em]"
                                    style={{ color: "var(--color-text-subtle)" }}
                                  >
                                    {kickoff.date} · {kickoff.time}
                                  </p>
                                  <p className="mt-2 text-sm font-semibold">{formatStageLabel(prediction.stage)}</p>
                                  <p
                                    className="mt-1 text-xs"
                                    style={{ color: "var(--color-text-subtle)" }}
                                  >
                                    {prediction.venue}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-xl font-black">{prediction.points}</p>
                                  <p
                                    className="text-[11px] uppercase tracking-[0.18em]"
                                    style={{ color: "var(--color-text-subtle)" }}
                                  >
                                    puntos
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  {getCountryFlagUrl(prediction.home) ? (
                                    <img
                                      src={getCountryFlagUrl(prediction.home)}
                                      alt=""
                                      className="h-4 w-6 rounded-sm object-cover"
                                    />
                                  ) : null}
                                  <span className="font-semibold">{prediction.home}</span>
                                </div>
                                <div
                                  className="text-xs uppercase tracking-[0.24em]"
                                  style={{ color: "var(--color-text-subtle)" }}
                                >
                                  vs
                                </div>
                                <div className="flex items-center gap-2">
                                  {getCountryFlagUrl(prediction.away) ? (
                                    <img
                                      src={getCountryFlagUrl(prediction.away)}
                                      alt=""
                                      className="h-4 w-6 rounded-sm object-cover"
                                    />
                                  ) : null}
                                  <span className="font-semibold">{prediction.away}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div
                                  className="rounded-2xl px-3 py-3"
                                  style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                                >
                                  <p
                                    className="text-[11px] uppercase tracking-[0.18em]"
                                    style={{ color: "var(--color-text-subtle)" }}
                                  >
                                    Predicción
                                  </p>
                                  <p className="mt-2 text-xl font-black">{predictedResult}</p>
                                  {(prediction.bonusPoints ?? 0) > 0 ? (
                                    <p className="mt-1 text-xs" style={{ color: "var(--color-accent)" }}>
                                      +{prediction.bonusPoints} por extra
                                    </p>
                                  ) : null}
                                </div>
                                <div
                                  className="rounded-2xl px-3 py-3"
                                  style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                                >
                                  <p
                                    className="text-[11px] uppercase tracking-[0.18em]"
                                    style={{ color: "var(--color-text-subtle)" }}
                                  >
                                    Resultado
                                  </p>
                                  <p className="mt-2 text-xl font-black">{actualResult}</p>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      <table className="hidden min-w-full border-collapse text-left text-sm md:table">
                        <thead
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.06)",
                            color: "var(--color-text-subtle)",
                          }}
                        >
                          <tr>
                            <th className="px-4 py-4">Kickoff</th>
                            <th className="px-4 py-4">Fase</th>
                            <th className="px-4 py-4">Partido</th>
                            <th className="px-4 py-4">Predicción</th>
                            <th className="px-4 py-4">Resultado</th>
                            <th className="px-4 py-4">Puntos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPredictions.map((prediction) => {
                            const kickoff = formatLocalMatchTime(prediction.kickoffAt);
                            const actualResult = formatPredictionValue(
                              prediction.actualHome,
                              prediction.actualAway,
                              "Sin resultado",
                            );
                            const predictedResult = formatPredictionValue(
                              prediction.predictedHome,
                              prediction.predictedAway,
                            );

                            return (
                              <tr
                                key={prediction.matchId}
                                style={{
                                  borderTop: "1px solid var(--color-border-accent)",
                                }}
                              >
                                <td
                                  className="px-4 py-4 align-top"
                                  style={{ color: "var(--color-text-subtle)" }}
                                >
                                  <div>{kickoff.date}</div>
                                  <div className="mt-1 text-xs">{kickoff.time}</div>
                                </td>
                                <td className="px-4 py-4 align-top">{formatStageLabel(prediction.stage)}</td>
                                <td className="px-4 py-4 align-top">
                                  <div className="flex items-center gap-2">
                                    {getCountryFlagUrl(prediction.home) ? (
                                      <img
                                        src={getCountryFlagUrl(prediction.home)}
                                        alt=""
                                        className="h-4 w-6 rounded-sm object-cover"
                                      />
                                    ) : null}
                                    <span>{prediction.home}</span>
                                    <span style={{ color: "var(--color-text-subtle)" }}>vs</span>
                                    {getCountryFlagUrl(prediction.away) ? (
                                      <img
                                        src={getCountryFlagUrl(prediction.away)}
                                        alt=""
                                        className="h-4 w-6 rounded-sm object-cover"
                                      />
                                    ) : null}
                                    <span>{prediction.away}</span>
                                  </div>
                                  <p
                                    className="mt-2 text-xs"
                                    style={{ color: "var(--color-text-subtle)" }}
                                  >
                                    {prediction.venue}
                                  </p>
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <div>{predictedResult}</div>
                                  {(prediction.bonusPoints ?? 0) > 0 ? (
                                    <div className="mt-1 text-xs" style={{ color: "var(--color-accent)" }}>
                                      +{prediction.bonusPoints} extra
                                    </div>
                                  ) : null}
                                </td>
                                <td className="px-4 py-4 align-top">{actualResult}</td>
                                <td className="px-4 py-4 align-top">{prediction.points}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
