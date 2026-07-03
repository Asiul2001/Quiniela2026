"use client";

import { useMemo, useState } from "react";
import type { ResultsMatch } from "@/lib/results-page-data";
import { getCountryFlagUrl } from "@/lib/country-flags";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getResolvedMatchStatus } from "@/lib/match-status";

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

function getTeamCode(name: string) {
  const codes: Record<string, string> = {
    Mexico: "MEX",
    "South Africa": "RSA",
    "South Korea": "KOR",
    "Czech Republic": "CZE",
    Canada: "CAN",
    "Bosnia and Herzegovina": "BIH",
    "Bosnia y Herzegovina": "BIH",
    "United States": "USA",
    "Estados Unidos": "USA",
    Paraguay: "PAR",
    Qatar: "QAT",
    Catar: "QAT",
    Switzerland: "SUI",
    Suiza: "SUI",
    Brazil: "BRA",
    Brasil: "BRA",
    Morocco: "MAR",
    Marruecos: "MAR",
    Haiti: "HAI",
    Escocia: "SCO",
    Scotland: "SCO",
    Australia: "AUS",
    Turkey: "TUR",
    "Alemania": "GER",
    Germany: "GER",
    Curacao: "CUW",
    "Curaçao": "CUW",
    Netherlands: "NED",
    "Paises Bajos": "NED",
    "Países Bajos": "NED",
    Japan: "JPN",
    Japón: "JPN",
    "Costa de Marfil": "CIV",
    Ecuador: "ECU",
    Sweden: "SWE",
    Suecia: "SWE",
    Tunisia: "TUN",
    Túnez: "TUN",
    Spain: "ESP",
    España: "ESP",
    "Cape Verde": "CPV",
    "Cabo Verde": "CPV",
    Belgium: "BEL",
    Bélgica: "BEL",
    Egypt: "EGY",
    Egipto: "EGY",
    "Saudi Arabia": "KSA",
    "Arabia Saudita": "KSA",
    Uruguay: "URU",
    Iran: "IRN",
    Irán: "IRN",
    "New Zealand": "NZL",
    "Nueva Zelanda": "NZL",
    France: "FRA",
    Francia: "FRA",
    Senegal: "SEN",
    Iraq: "IRQ",
    Irak: "IRQ",
    Norway: "NOR",
    Noruega: "NOR",
    Argentina: "ARG",
    Algeria: "ALG",
    Argelia: "ALG",
    Austria: "AUT",
    Jordan: "JOR",
    Jordania: "JOR",
    Portugal: "POR",
    England: "ENG",
    Inglaterra: "ENG",
    Croatia: "CRO",
    Croacia: "CRO",
    Ghana: "GHA",
    Panama: "PAN",
    Panamá: "PAN",
    Uzbekistan: "UZB",
    Uzbekistán: "UZB",
    Colombia: "COL",
  };

  return codes[name.trim()] ?? name.trim().slice(0, 3).toUpperCase();
}

function getPredictionTone(match: ResultsMatch, prediction: ResultsMatch["predictions"][number]) {
  const points = prediction.matchPoints;

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
  return getResolvedMatchStatus({
    status: match.status,
    kickoffAt: match.kickoffAt,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
  });
}

function isKnockoutStage(stage: string) {
  return stage !== "group";
}

function formatPenaltySummary(match: ResultsMatch) {
  if (match.homePenaltyScore == null || match.awayPenaltyScore == null) {
    return null;
  }

  return `Penales ${match.homePenaltyScore}-${match.awayPenaltyScore}`;
}

export function ResultsPageClient({ matches }: { matches: ResultsMatch[] }) {
  const ADMIN_USER_ID = "f22bd32d-d193-4ba4-8832-12da8f7ffc86";
  const { user } = useAuthUser();
  const isAdmin = user?.id === ADMIN_USER_ID;
  const [matchesState, setMatchesState] = useState(matches);
  const [filter, setFilter] = useState<"all" | "live" | "completed" | "scheduled">("all");
  const [editedScores, setEditedScores] = useState<
    Record<string, { home: string; away: string; penaltyHome?: string; penaltyAway?: string; status?: string }>
  >({});
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);

  const filteredMatches = useMemo(() => {
    if (filter === "all") {
      return matchesState;
    }

    return matchesState.filter((match) => getDisplayStatus(match) === filter);
  }, [filter, matchesState]);

  async function saveMatch(match: ResultsMatch) {
    const score = editedScores[match.id];

    const homeScoreValue = score?.home ?? String(match.homeScore ?? "");
    const awayScoreValue = score?.away ?? String(match.awayScore ?? "");
    const penaltyHomeValue = score?.penaltyHome ?? String(match.homePenaltyScore ?? "");
    const penaltyAwayValue = score?.penaltyAway ?? String(match.awayPenaltyScore ?? "");

    if (homeScoreValue === "" || awayScoreValue === "") {
      alert("Pon ambos marcadores antes de guardar.");
      return;
    }

    const isDraw = Number(homeScoreValue) === Number(awayScoreValue);
    const needsPenalties = isKnockoutStage(match.stage) && isDraw;

    if (needsPenalties && (penaltyHomeValue === "" || penaltyAwayValue === "")) {
      alert("Si el partido termina empatado en fase final, guarda tambien los penales.");
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
        homePenaltyScore: needsPenalties ? Number(penaltyHomeValue) : null,
        awayPenaltyScore: needsPenalties ? Number(penaltyAwayValue) : null,
        status: "completed",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("SAVE RESULT ERROR", result);
      alert(result.error ?? "No se pudo guardar.");
      return;
    }

    setMatchesState((current) =>
      current.map((currentMatch) =>
        currentMatch.id === match.id
          ? {
              ...currentMatch,
              homeScore: Number(homeScoreValue),
              awayScore: Number(awayScoreValue),
              homePenaltyScore: needsPenalties ? Number(penaltyHomeValue) : null,
              awayPenaltyScore: needsPenalties ? Number(penaltyAwayValue) : null,
              status: "completed",
            }
          : currentMatch,
      ),
    );
    setEditedScores((current) => ({
      ...current,
      [match.id]: {
        home: homeScoreValue,
        away: awayScoreValue,
        penaltyHome: needsPenalties ? penaltyHomeValue : "",
        penaltyAway: needsPenalties ? penaltyAwayValue : "",
        status: "completed",
      },
    }));
    alert("Resultado guardado.");
  }

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
          const editedHome = editedScores[match.id]?.home ?? String(match.homeScore ?? "");
          const editedAway = editedScores[match.id]?.away ?? String(match.awayScore ?? "");
          const showPenaltyInputs =
            isAdmin &&
            isKnockoutStage(match.stage) &&
            editedHome !== "" &&
            editedAway !== "" &&
            Number(editedHome) === Number(editedAway);
          const penaltySummary = formatPenaltySummary(match);

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
              <div className="space-y-3">
                <div
                  className="flex flex-wrap items-center gap-2 text-xs"
                  style={{ color: "var(--color-text-subtle)" }}
                >
                  <span>{kickoff.date}</span>
                  <span>·</span>
                  <span>{kickoff.time}</span>
                  <span className="truncate">· {formatStage(match.stage)}</span>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                  <div className="min-w-0 text-right">
                    <div className="flex min-w-0 items-center justify-end gap-2 font-black">
                      {getCountryFlagUrl(match.home) ? (
                        <img
                          src={getCountryFlagUrl(match.home)}
                          alt=""
                          className="h-4 w-6 rounded-sm object-cover"
                        />
                      ) : null}
                      <span className="truncate sm:hidden">{getTeamCode(match.home)}</span>
                      <span className="hidden truncate sm:inline">{match.home}</span>
                    </div>
                    <div
                      className="mt-1 text-[11px] uppercase tracking-[0.18em]"
                      style={{ color: "var(--color-text-subtle)" }}
                    >
                      Local
                    </div>
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
                                penaltyHome: current[match.id]?.penaltyHome ?? String(match.homePenaltyScore ?? ""),
                                penaltyAway: current[match.id]?.penaltyAway ?? String(match.awayPenaltyScore ?? ""),
                              },
                            }))
                          }
                          className="w-12 rounded px-2 py-1 text-center"
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
                                penaltyHome: current[match.id]?.penaltyHome ?? String(match.homePenaltyScore ?? ""),
                                penaltyAway: current[match.id]?.penaltyAway ?? String(match.awayPenaltyScore ?? ""),
                              },
                            }))
                          }
                          className="w-12 rounded px-2 py-1 text-center"
                        />
                      </div>
                    ) : hasScore ? (
                      <div>
                        <div className="text-2xl font-black">
                          {match.homeScore} - {match.awayScore}
                        </div>
                        {penaltySummary ? (
                          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-subtle)" }}>
                            {penaltySummary}
                          </div>
                        ) : null}
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
                      <div className="mt-3 space-y-2">
                        {showPenaltyInputs ? (
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              value={editedScores[match.id]?.penaltyHome ?? String(match.homePenaltyScore ?? "")}
                              onChange={(event) =>
                                setEditedScores((current) => ({
                                  ...current,
                                  [match.id]: {
                                    home: current[match.id]?.home ?? String(match.homeScore ?? ""),
                                    away: current[match.id]?.away ?? String(match.awayScore ?? ""),
                                    penaltyHome: event.target.value,
                                    penaltyAway: current[match.id]?.penaltyAway ?? String(match.awayPenaltyScore ?? ""),
                                  },
                                }))
                              }
                              className="w-12 rounded px-2 py-1 text-center"
                              aria-label={`Penales de ${match.home}`}
                            />
                            <span className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                              pen
                            </span>
                            <input
                              type="number"
                              value={editedScores[match.id]?.penaltyAway ?? String(match.awayPenaltyScore ?? "")}
                              onChange={(event) =>
                                setEditedScores((current) => ({
                                  ...current,
                                  [match.id]: {
                                    home: current[match.id]?.home ?? String(match.homeScore ?? ""),
                                    away: current[match.id]?.away ?? String(match.awayScore ?? ""),
                                    penaltyHome: current[match.id]?.penaltyHome ?? String(match.homePenaltyScore ?? ""),
                                    penaltyAway: event.target.value,
                                  },
                                }))
                              }
                              className="w-12 rounded px-2 py-1 text-center"
                              aria-label={`Penales de ${match.away}`}
                            />
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => saveMatch(match)}
                          className="rounded-full px-4 py-2 text-xs font-bold transition hover:scale-105"
                          style={{
                            border: "1px solid var(--color-border-accent)",
                            backgroundColor:
                              "color-mix(in srgb, var(--color-accent) 22%, rgba(255,255,255,0.08))",
                            color: "var(--color-text)",
                          }}
                        >
                          Guardar resultado
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 text-left">
                    <div className="flex min-w-0 items-center gap-2 font-black">
                      {getCountryFlagUrl(match.away) ? (
                        <img
                          src={getCountryFlagUrl(match.away)}
                          alt=""
                          className="h-4 w-6 rounded-sm object-cover"
                        />
                      ) : null}
                      <span className="truncate sm:hidden">{getTeamCode(match.away)}</span>
                      <span className="hidden truncate sm:inline">{match.away}</span>
                    </div>
                    <div
                      className="mt-1 text-[11px] uppercase tracking-[0.18em]"
                      style={{ color: "var(--color-text-subtle)" }}
                    >
                      Visitante
                    </div>
                  </div>
                </div>

                <div
                  className="truncate text-xs"
                  style={{ color: "var(--color-text-subtle)" }}
                >
                  {match.venue}
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
                        Todavia no hay predicciones para este partido.
                      </p>
                    ) : (
                      match.predictions.map((prediction) => {
                        const tone = getPredictionTone(match, prediction);
                        const points = prediction.matchPoints;

                        return (
                          <div
                            key={prediction.memberId}
                            className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-2 rounded-xl px-3 py-2 text-sm sm:grid-cols-[2rem_1fr_auto_auto] sm:items-center sm:gap-3"
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
                            <span className="min-w-0 truncate font-bold">{prediction.memberName}</span>
                            <span className="font-black sm:text-right">
                              {prediction.predictedHome ?? "-"} - {prediction.predictedAway ?? "-"}
                            </span>
                            <span className="text-xs font-bold sm:text-right">
                              {`+${points} pts`}
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
