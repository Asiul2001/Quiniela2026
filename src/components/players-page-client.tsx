"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCountryFlagUrl } from "@/lib/country-flags";
import { useAuthUser } from "@/hooks/use-auth-user";

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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Player leaderboard</p>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">Browse league members</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Compare current points, completion rate and upcoming predictions for every player in the league.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
            >
              Return home
            </Link>
            <Link
              href="/predictions"
              className="rounded-full border border-cyan-500 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Make my picks
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-8 text-center text-slate-300">
            Loading player data...
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-rose-500 bg-rose-500/10 p-8 text-slate-100">
            <p className="font-semibold">Unable to load league players.</p>
            <p className="mt-2 text-sm text-slate-300">{error}</p>
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="space-y-5">
              <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-6">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-400">League players</p>
                    <p className="mt-2 text-2xl font-black text-white">{players.length} members tracked</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                    League ID: {leagueId ?? "—"}
                  </div>
                </div>

                <div className="space-y-3">
                  {players.map((player, index) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setSelectedPlayerId(player.id)}
                      className={`w-full rounded-[1.75rem] border px-4 py-4 text-left transition duration-200 ${
                        player.id === selectedPlayer?.id
                          ? "border-cyan-400 bg-cyan-500/10 text-white"
                          : "border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-600 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold">{player.name}</p>
                          <p className="mt-1 text-sm text-slate-500">Predictions saved: {player.predictionsCount}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black">{player.points}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{player.completion}% complete</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-6">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Selected player</p>
                    <p className="mt-2 text-3xl font-black text-white">{selectedPlayer?.name ?? "No player selected"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                    {selectedPlayer ? `${selectedPlayer.points} points · ${selectedPlayer.completion}% filled` : "Pick a player"}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950/80">
                  <table className="min-w-full border-collapse text-left text-sm text-slate-200">
                    <thead className="bg-slate-900/90 text-slate-400">
                      <tr>
                        <th className="px-4 py-4">Kickoff</th>
                        <th className="px-4 py-4">Fixture</th>
                        <th className="px-4 py-4">Prediction</th>
                        <th className="px-4 py-4">Result</th>
                        <th className="px-4 py-4">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPredictions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            This player has not saved any predictions yet.
                          </td>
                        </tr>
                      ) : (
                        selectedPredictions.map((prediction) => {
                          const kickoff = formatLocalMatchTime(prediction.kickoffAt);
                          const actualResult =
                            prediction.actualHome !== null && prediction.actualAway !== null
                              ? `${prediction.actualHome}-${prediction.actualAway}`
                              : "TBD";
                          const predictedResult =
                            prediction.predictedHome !== null && prediction.predictedAway !== null
                              ? `${prediction.predictedHome}-${prediction.predictedAway}`
                              : "—";

                          return (
                            <tr key={prediction.matchId} className="border-t border-slate-800">
                              <td className="px-4 py-4 align-top text-slate-300">
                                <div>{kickoff.date}</div>
                                <div className="mt-1 text-xs text-slate-500">{kickoff.time}</div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <div className="flex items-center gap-2 text-slate-100">
                                  {getCountryFlagUrl(prediction.home) ? (
                                    <img src={getCountryFlagUrl(prediction.home)} alt="" className="h-4 w-6 rounded-sm object-cover" />
                                  ) : null}
                                  <span>{prediction.home}</span>
                                  <span className="text-slate-500">vs</span>
                                  {getCountryFlagUrl(prediction.away) ? (
                                    <img src={getCountryFlagUrl(prediction.away)} alt="" className="h-4 w-6 rounded-sm object-cover" />
                                  ) : null}
                                  <span>{prediction.away}</span>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">{prediction.stage}</p>
                              </td>
                              <td className="px-4 py-4 align-top text-slate-200">{predictedResult}</td>
                              <td className="px-4 py-4 align-top text-slate-200">{actualResult}</td>
                              <td className="px-4 py-4 align-top text-slate-200">{prediction.points}</td>
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
