"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCountryFlagUrl } from "@/lib/country-flags";
import { useAuthUser } from "@/hooks/use-auth-user";
import { PRIMARY_LEAGUE_NAME } from "@/lib/app-config";
import { useSyncExternalStore } from "react";
import {
  subscribeToTheme,
  getThemeSnapshot,
  getThemeServerSnapshot,
} from "src/components/home-page-client";

type ThemeName = "standard" | "canada" | "usa" | "mexico";

type PlayerSummary = {
  id: string;
  userId: string;
  name: string;
  points: number;
  completion: number;
  predictionsCount: number;
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

function getPredictionPoints(prediction: any) {
  if (!prediction?.prediction_scores) {
    return 0;
  }

  if (Array.isArray(prediction.prediction_scores)) {
    return prediction.prediction_scores[0]?.total_points ?? 0;
  }

  return prediction.prediction_scores.total_points ?? 0;
}

export function PlayersPageClient() {
  const { user } = useAuthUser();
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [playerPredictions, setPlayerPredictions] = useState<Record<string, PlayerPrediction[]>>({});
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const theme = useSyncExternalStore(
  subscribeToTheme,
  getThemeSnapshot,
  getThemeServerSnapshot,
);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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

    return (playerPredictions[selectedPlayer.id] ?? []).sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
  }, [playerPredictions, selectedPlayer]);
return (
  <main
    className="min-h-screen"
    style={{
      backgroundColor: "var(--color-primary)",
      color: "var(--color-text)",
    }}
  >
    
    <div
      className="absolute inset-0 -z-10"
      style={{ backgroundImage: "var(--gradient-primary)" }}
    />

    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p
            className="text-xs uppercase tracking-[0.28em]"
            style={{ color: "var(--color-accent)" }}
          >
            Ranking de jugadores
          </p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Miembros de la liga
          </h1>
          <p
            className="mt-3 max-w-2xl text-sm leading-7"
            style={{ color: "var(--color-text-subtle)" }}
          >
            Compara los puntos actuales, el porcentaje de aciertos y las predicciones para los próximos partidos de cada jugador de la liga.
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
              backgroundColor: "color-mix(in srgb, var(--color-accent) 14%, rgba(255, 255, 255, 0.06))",
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
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p
                    className="text-sm uppercase tracking-[0.24em]"
                    style={{ color: "var(--color-text-subtle)" }}
                  >
                    Jugadores de la liga
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {players.length} Miembros en la liga
                  </p>
                </div>
                <div
                  className="rounded-2xl px-4 py-3 text-sm"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.06)",
                    color: "var(--color-text-subtle)",
                  }}
                >
                  Nombre de la liga: {PRIMARY_LEAGUE_NAME ?? "—"}
                </div>
              </div>

              <div className="space-y-3">
                {players.map((player,index) => {
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
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xl font-black" style={{ color: "var(--color-accent)" }}>#{index+1}</p>
                          <p className="text-base font-semibold">{player.name}</p>
                        <div>
                          <p
                            className="mt-1 text-sm"
                            style={{ color: "var(--color-text-subtle)" }}
                          >
                            Predicciones guardadas: {player.predictionsCount}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black">{player.points}</p>
                          <p
                            className="text-xs uppercase tracking-[0.18em]"
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
                  <p className="mt-2 text-3xl font-black">
                    {selectedPlayer?.name ?? "No player selected"}
                  </p>
                </div>
                <div
                  className="rounded-2xl px-4 py-3 text-sm"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.06)",
                    color: "var(--color-text-subtle)",
                  }}
                >
                  {selectedPlayer
                    ? `${selectedPlayer.points} puntos · ${selectedPlayer.completion}% completado`
                    : "Pick a player"}
                </div>
              </div>

              <div
                className="overflow-hidden rounded-[1.75rem]"
                style={{
                  border: "1px solid var(--color-border-accent)",
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                }}
              >
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                      color: "var(--color-text-subtle)",
                    }}
                  >
                    <tr>
                      <th className="px-4 py-4">Kickoff</th>
                      <th className="px-4 py-4">Partido</th>
                      <th className="px-4 py-4">Predicción</th>
                      <th className="px-4 py-4">Resultado</th>
                      <th className="px-4 py-4">Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPredictions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center"
                          style={{ color: "var(--color-text-subtle)" }}
                        >
                          Este jugador no ha guardado ninguna predicción todavía.
                        </td>
                      </tr>
                    ) : (
                      selectedPredictions.map((prediction) => {
                        const kickoff = formatLocalMatchTime(prediction.kickoffAt);
                        const actualResult =
                          prediction.actualHome !== null && prediction.actualAway !== null
                            ? `${prediction.actualHome}-${prediction.actualAway}`
                            : "Sin resultado";
                        const predictedResult =
                          prediction.predictedHome !== null && prediction.predictedAway !== null
                            ? `${prediction.predictedHome}-${prediction.predictedAway}`
                            : "—";

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
                                <span style={{ color: "var(--color-text-subtle)" }}>
                                  vs
                                </span>
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
                                {prediction.stage}
                              </p>
                            </td>
                            <td className="px-4 py-4 align-top">{predictedResult}</td>
                            <td className="px-4 py-4 align-top">{actualResult}</td>
                            <td className="px-4 py-4 align-top">{prediction.points}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  </main>
);
}
