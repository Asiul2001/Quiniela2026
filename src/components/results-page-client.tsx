"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ResultsMatch } from "@/lib/results-page-data";
import { getCountryFlagUrl } from "@/lib/country-flags";
import {
  subscribeToTheme,
  getThemeSnapshot,
  getThemeServerSnapshot,
} from "src/components/home-page-client";
import { useAuthUser } from "@/hooks/use-auth-user";


type ThemeName = "standard" | "canada" | "usa" | "mexico";

function formatKickoff(kickoffAt: string) {
  const date = new Date(kickoffAt);

  return {
    date: new Intl.DateTimeFormat("es-MX", {
      month: "short",
      day: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date),
  };
}




function formatStage(stage: string) {
  const labels: Record<string, string> = {
    group: "Fase de grupos",
    round_of_32: "Dieciseisavos",
    round_of_16: "Octavos",
    quarter_final: "Cuartos",
    semi_final: "Semifinal",
    third_place: "Tercer lugar",
    final: "Final",
  };

  return labels[stage] ?? stage;
}

function getPredictionPoints(match: ResultsMatch, prediction: ResultsMatch["predictions"][number]) {
  if (
    match.homeScore === null ||
    match.awayScore === null ||
    prediction.predictedHome === null ||
    prediction.predictedAway === null
  ) {
    return 0;
  }

  const exact =
    prediction.predictedHome === match.homeScore &&
    prediction.predictedAway === match.awayScore;

  if (exact) return 5;

  const actualOutcome =
    match.homeScore === match.awayScore
      ? "draw"
      : match.homeScore > match.awayScore
        ? "home"
        : "away";

  const predictedOutcome =
    prediction.predictedHome === prediction.predictedAway
      ? "draw"
      : prediction.predictedHome > prediction.predictedAway
        ? "home"
        : "away";

  if (actualOutcome === predictedOutcome) return 1;

  return 0;
}

function getPredictionTone(match: ResultsMatch, prediction: ResultsMatch["predictions"][number]) {
  const points = getPredictionPoints(match, prediction);

  if (points === 5) return "exact";
  if (points > 0) return "outcome";
  return "wrong";
}

function statusLabel(status: string) {
  if (status === "live") return "LIVE";
  if (status === "completed") return "Finalizado";
  if (status === "cancelled") return "Cancelado";
  return "Programado";
}

function getDisplayStatus(match: ResultsMatch) {
  if (match.status === "completed") return "completed";

  const now = Date.now();
  const kickoff = new Date(match.kickoffAt).getTime();
  const estimatedEnd = kickoff + 2 * 60 * 60 * 1000;

  if (now >= kickoff && now < estimatedEnd) return "live";

  return "scheduled";
}

export function ResultsPageClient({ matches }: { matches: ResultsMatch[] }) {
  const ADMIN_USER_ID = "f22bd32d-d193-4ba4-8832-12da8f7ffc86";
  const { user } = useAuthUser();
  const isAdmin = user?.id === ADMIN_USER_ID;
  const [filter, setFilter] = useState<"all" | "live" | "completed" | "scheduled">("all"); 
  const [editedScores, setEditedScores] = useState<
  Record<string, { home: string; away: string; status?: string }>
  >({});
  const filteredMatches = useMemo(() => { if (filter === "all") 
    return matches; return matches.filter((match) => match.status === filter); }, [filter, matches]);
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);

async function saveMatch(match: ResultsMatch) {
  const score = editedScores[match.id];

  const homeScoreValue = score?.home ?? String(match.homeScore ?? "");
  const awayScoreValue = score?.away ?? String(match.awayScore ?? "");

  if (homeScoreValue === "" || awayScoreValue === "") {
    alert("Pon ambos marcadores antes de guardar.");
    return;
  }

  const response = await fetch("/api/results/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
    matchId: match.id,
    homeScore: Number(homeScoreValue),
    awayScore: Number(awayScoreValue),
    status: "completed",
  }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error("SAVE RESULT ERROR", result);
    alert(result.error ?? "No se pudo guardar.");
    return;
  }

  alert("Resultado guardado.");
  window.location.reload();
}

  const theme = useSyncExternalStore(
  subscribeToTheme,
  getThemeSnapshot,
  getThemeServerSnapshot,
);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

return (
  <section className="space-y-6">
    <div className="flex flex-wrap gap-3">
      {(["all", "live", "completed", "scheduled"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setFilter(item)}
          className="rounded-full px-4 py-2 text-sm font-semibold"
          style={{
            border: "1px solid var(--color-border-accent)",
            backgroundColor:
              filter === item
                ? "color-mix(in srgb, var(--color-accent) 18%, rgba(255,255,255,0.08))"
                : "rgba(255,255,255,0.06)",
            color: "var(--color-text)",
          }}
        >
          {item === "all" ? "Todos" : statusLabel(item)}
        </button>
      ))}
    </div>

    <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
      {filteredMatches.map((match) => {
        const kickoff = formatKickoff(match.kickoffAt);
        const hasScore = match.homeScore !== null && match.awayScore !== null;
        const displayStatus = getDisplayStatus(match);

        return (
          <article
            key={match.id}
            onClick={() =>
              setOpenMatchId((current) => (current === match.id ? null : match.id))
            }
            className="cursor-pointer rounded-[1.25rem] p-3"
            style={{
              border: "1px solid var(--color-border-accent)",
              backgroundColor: "var(--color-bg-card)",
            }}
          >
            <div className="grid gap-2 md:grid-cols-[4.5rem_1fr_auto_1fr] md:items-center">
              <div className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                <div>{kickoff.date}</div>
                <div>{kickoff.time}</div>
              </div>

              <div className="flex items-center justify-end gap-2 font-black md:text-right">
                {getCountryFlagUrl(match.home) ? (
                  <img
                    src={getCountryFlagUrl(match.home)}
                    alt=""
                    className="h-4 w-6 rounded-sm object-cover"
                  />
                ) : null}
                <span>{match.home}</span>
              </div>

              <div
                className="text-center"
                onClick={(event) => {
                  if (isAdmin) event.stopPropagation();
                }}
              >
                {isAdmin ? (
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="number"
                      value={editedScores[match.id]?.home ?? String(match.homeScore ?? "")}
                      onChange={(event) =>
                        setEditedScores((current) => ({
                          ...current,
                          [match.id]: {
                            home: event.target.value,
                            away: current[match.id]?.away ?? String(match.awayScore ?? ""),
                          },
                        }))
                      }
                      className="w-14 rounded px-2 py-1 text-center"
                    />

                    <span>-</span>

                    <input
                      type="number"
                      value={editedScores[match.id]?.away ?? String(match.awayScore ?? "")}
                      onChange={(event) =>
                        setEditedScores((current) => ({
                          ...current,
                          [match.id]: {
                            home: current[match.id]?.home ?? String(match.homeScore ?? ""),
                            away: event.target.value,
                          },
                        }))
                      }
                      className="w-14 rounded px-2 py-1 text-center"
                    />
                  </div>
                ) : hasScore ? (
                  <div className="text-2xl font-black">
                    {match.homeScore} - {match.awayScore}
                  </div>
                ) : (
                  <div
                    className="text-sm font-bold"
                    style={{ color: "var(--color-text-subtle)" }}
                  >
                    VS
                  </div>
                )}

                <div
                  className="mt-1 rounded-full px-3 py-1 text-xs font-semibold uppercase"
                  style={{
                    border: "1px solid var(--color-border-accent)",
                    backgroundColor:
                      displayStatus === "live"
                        ? "rgba(239,68,68,0.18)"
                        : "rgba(255,255,255,0.06)",
                    color:
                      displayStatus === "live"
                        ? "rgb(254,202,202)"
                        : "var(--color-text-subtle)",
                  }}
                >
                  {statusLabel(displayStatus)}
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => saveMatch(match)}
                    className="mt-3 rounded-full px-4 py-2 text-xs font-bold transition hover:scale-105"
                    style={{
                      border: "1px solid var(--color-border-accent)",
                      backgroundColor:
                        "color-mix(in srgb, var(--color-accent) 22%, rgba(255,255,255,0.08))",
                      color: "var(--color-text)",
                    }}
                  >
                    Guardar resultado
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 font-black">
                {getCountryFlagUrl(match.away) ? (
                  <img
                    src={getCountryFlagUrl(match.away)}
                    alt=""
                    className="h-4 w-6 rounded-sm object-cover"
                  />
                ) : null}
                <span>{match.away}</span>
              </div>

              <div
                className="col-span-full truncate text-xs"
                style={{ color: "var(--color-text-subtle)" }}
              >
                {formatStage(match.stage)} · {match.venue}
              </div>
            </div>

            {openMatchId === match.id && (
              <div
                className="mt-4 rounded-2xl p-3"
                style={{
                  border: "1px solid var(--color-border-accent)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                }}
              >
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.18em]">
                  <span style={{ color: "var(--color-text-subtle)" }}>Ranking actual</span>
                  <span style={{ color: "var(--color-text-subtle)" }}>Predicciones</span>
                </div>

                <div className="space-y-2">
                  {match.predictions.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                      Todavía no hay predicciones para este partido.
                    </p>
                  ) : (
                    match.predictions.map((prediction, index) => {
                      const tone = getPredictionTone(match, prediction);
                      const points = getPredictionPoints(match, prediction);

                      return (
                        <div
                          key={prediction.memberId}
                          className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 rounded-xl px-3 py-2 text-sm"
                          style={{
                            backgroundColor:
                              tone === "exact"
                                ? "rgba(34,197,94,0.18)"
                                : tone === "outcome"
                                  ? "rgba(234,179,8,0.18)"
                                  : "rgba(255,255,255,0.04)",
                          }}
                        >
                          <span className="font-black">#{prediction.globalRank}</span>
                          <span className="font-bold">{prediction.memberName}</span>
                          <span className="font-black">
                            {prediction.predictedHome ?? "-"} - {prediction.predictedAway ?? "-"}
                          </span>
                          <span className="text-xs font-bold">
                            {match.status === "completed"
                              ? `+${points}`
                              : `+${prediction.matchPoints} pts`}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  </section>
);
}