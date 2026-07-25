import "server-only";
import { PRIMARY_LEAGUE_SLUG } from "@/lib/app-config";
import { buildCanonicalLeagueStandings } from "@/lib/server-standings";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getClosingPrize } from "@/lib/tournament-awards";
import type { Stage } from "@/lib/types";

type PredictionScoreShape =
  | {
      total_points?: number | null;
      bonus_points?: number | null;
    }
  | Array<{
      total_points?: number | null;
      bonus_points?: number | null;
    }>
  | null;

type CanonicalPredictionRow = {
  id: string;
  member_id: string;
  match_id: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  updated_at?: string | null;
  prediction_scores?: PredictionScoreShape;
};

export type PlayersBrowsePayload = {
  leagueId: string;
  players: Array<{
    id: string;
    userId: string;
    rank: number;
    name: string;
    points: number;
    completion: number;
    predictionsCount: number;
    specialPrize: {
      title: string;
      definition: string;
      detail: string;
    };
    breakdown: {
      matchPoints: number;
      extraPoints: number;
      darkHorsePoints: number;
      goldenBootPoints: number;
      projectionPoints: number;
    };
  }>;
  playerPredictions: Record<string, Array<Record<string, unknown>>>;
  playerExtraPoints: Record<string, Array<Record<string, unknown>>>;
  darkHorseGallery: Array<{
    playerId: string;
    playerName: string;
    playerRank: number;
    teamName: string;
    progress: string;
    points: number;
  }>;
  goldenBootGallery: Array<{
    playerId: string;
    playerName: string;
    playerRank: number;
    goldenBootPick: string;
  }>;
};

const PAGE_SIZE = 1000;

function getPredictionScore(predictionScores: PredictionScoreShape) {
  if (!predictionScores) {
    return { totalPoints: 0, bonusPoints: 0 };
  }

  const row = Array.isArray(predictionScores) ? predictionScores[0] : predictionScores;

  return {
    totalPoints: row?.total_points ?? 0,
    bonusPoints: row?.bonus_points ?? 0,
  };
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

function formatProgressLabel(progress: string) {
  const labels: Record<string, string> = {
    round_of_32: "llego a dieciseisavos",
    round_of_16: "llego a octavos",
    quarter_final: "llego a cuartos",
    semi_final: "llego a semifinal",
    final: "llego a la final",
    champion: "fue campeon",
  };

  return labels[progress] ?? progress;
}

function getTimestampRank(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getActualScoreLabel(match: {
  home_score: number | null;
  away_score: number | null;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
}) {
  if (match.home_score === null || match.away_score === null) {
    return "Sin resultado";
  }

  return `${match.home_score}-${match.away_score}${
    match.home_penalty_score !== null && match.away_penalty_score !== null
      ? ` · penales ${match.home_penalty_score}-${match.away_penalty_score}`
      : ""
  }`;
}

async function fetchAllLeaguePredictions(
  client: ReturnType<typeof getSupabaseServerClient>,
  leagueId: string,
) {
  const rows: CanonicalPredictionRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from("predictions")
      .select("id,member_id,match_id,predicted_home_score,predicted_away_score,updated_at,prediction_scores(total_points,bonus_points)")
      .eq("league_id", leagueId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    rows.push(...((data ?? []) as CanonicalPredictionRow[]));

    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

export async function getPlayersBrowseData(): Promise<PlayersBrowsePayload> {
  const client = getSupabaseServerClient();

  const { data: league, error: leagueError } = await client
    .from("leagues")
    .select("id")
    .eq("slug", PRIMARY_LEAGUE_SLUG)
    .maybeSingle();

  if (leagueError) {
    throw new Error(leagueError.message);
  }

  if (!league?.id) {
    throw new Error("League not found.");
  }

  const { data: leagueTournament, error: leagueTournamentError } = await client
    .from("league_tournaments")
    .select("tournament_id")
    .eq("league_id", league.id)
    .limit(1)
    .maybeSingle();

  const [
    { data: members, error: membersError },
    { data: profiles, error: profilesError },
    { data: teams, error: teamsError },
    { data: matches, error: matchesError },
    { data: darkHorsePredictions, error: darkHorsePredictionsError },
    { data: goldenBootPredictions, error: goldenBootPredictionsError },
  ] = await Promise.all([
    client.from("league_members").select("id,user_id").eq("league_id", league.id),
    client.from("profiles").select("id,display_name,full_name"),
    client.from("teams").select("id,name,team_tier").eq("tournament_id", leagueTournament?.tournament_id),
    client
      .from("matches")
      .select("id,stage,round_number,match_number,home_team_id,away_team_id,kickoff_at,venue,status,updated_at,home_score,away_score,home_penalty_score,away_penalty_score")
      .eq("tournament_id", leagueTournament?.tournament_id)
      .order("kickoff_at", { ascending: true }),
    client
      .from("bonus_predictions")
      .select("member_id,payload")
      .eq("league_id", league.id)
      .eq("tournament_id", leagueTournament?.tournament_id)
      .eq("type", "dark_horse"),
    client
      .from("bonus_predictions")
      .select("member_id,payload")
      .eq("league_id", league.id)
      .eq("tournament_id", leagueTournament?.tournament_id)
      .eq("type", "golden_boot"),
  ]);

  if (
    leagueTournamentError ||
    membersError ||
    profilesError ||
    teamsError ||
    matchesError ||
    darkHorsePredictionsError ||
    goldenBootPredictionsError
  ) {
    const errorMessage =
      leagueTournamentError?.message ||
      membersError?.message ||
      profilesError?.message ||
      teamsError?.message ||
      matchesError?.message ||
      darkHorsePredictionsError?.message ||
      goldenBootPredictionsError?.message;

    throw new Error(errorMessage ?? "Unable to load player browser data.");
  }

  const rawPredictions = await fetchAllLeaguePredictions(client, league.id);
  const teamMap = new Map((teams ?? []).map((team) => [team.id, team.name]));
  const standingsSource = buildCanonicalLeagueStandings({
    members: members ?? [],
    profiles: profiles ?? [],
    teams: teams ?? [],
    matches: (matches ?? []).map((match) => ({
      id: match.id,
      stage: match.stage as Stage,
      round_number: match.round_number ?? null,
      match_number: match.match_number ?? null,
      home_team_id: match.home_team_id,
      away_team_id: match.away_team_id,
      kickoff_at: match.kickoff_at,
      venue: match.venue ?? null,
      status: match.status ?? null,
      updated_at: match.updated_at ?? null,
      home_score: match.home_score,
      away_score: match.away_score,
      home_penalty_score: match.home_penalty_score ?? null,
      away_penalty_score: match.away_penalty_score ?? null,
    })),
    predictions: rawPredictions,
    darkHorsePredictions: (darkHorsePredictions ?? []) as Array<{
      member_id: string;
      payload: Record<string, unknown> | null;
    }>,
    goldenBootPredictions: (goldenBootPredictions ?? []) as Array<{
      member_id: string;
      payload: Record<string, unknown> | null;
    }>,
  });

  const matchMap = new Map(standingsSource.canonicalMatches.map((match) => [match.id, match]));
  const extraPointsByMember = new Map<string, Array<Record<string, unknown>>>();
  const canonicalPredictions = new Map<string, CanonicalPredictionRow>();

  for (const prediction of standingsSource.canonicalPredictions) {
    const key = `${prediction.member_id}::${prediction.match_id}`;
    const existing = canonicalPredictions.get(key);

    if (!existing) {
      canonicalPredictions.set(key, prediction as CanonicalPredictionRow);
      continue;
    }

    const existingUpdatedAt = getTimestampRank(existing.updated_at);
    const candidateUpdatedAt = getTimestampRank(prediction.updated_at);

    if (
      candidateUpdatedAt > existingUpdatedAt ||
      (candidateUpdatedAt === existingUpdatedAt && prediction.id.localeCompare(existing.id) > 0)
    ) {
      canonicalPredictions.set(key, prediction as CanonicalPredictionRow);
    }
  }

  for (const prediction of canonicalPredictions.values()) {
    const match = matchMap.get(prediction.match_id);
    if (!match) {
      continue;
    }

    const score = getPredictionScore(prediction.prediction_scores ?? null);
    if (score.bonusPoints <= 0 || match.stage === "round_of_32") {
      continue;
    }

    const existingExtras = extraPointsByMember.get(prediction.member_id) ?? [];
    existingExtras.push({
      id: `projection-${prediction.id}`,
      label: "Cruce o avance acertado",
      detail: `Pronosticado: ${prediction.predicted_home_score ?? "-"}-${prediction.predicted_away_score ?? "-"} · ${teamMap.get(match.home_team_id) ?? "Home team"} vs ${teamMap.get(match.away_team_id) ?? "Away team"}`,
      secondaryDetail: `Real ${formatStageLabel(match.stage)}: ${getActualScoreLabel(match)} · ${teamMap.get(match.home_team_id) ?? "Home team"} vs ${teamMap.get(match.away_team_id) ?? "Away team"}`,
      points: score.bonusPoints,
      category: "projection_bonus",
      kickoffAt: match.kickoff_at,
    });
    extraPointsByMember.set(prediction.member_id, existingExtras);
  }

  for (const [memberId, breakdown] of standingsSource.darkHorseBreakdownByMember.entries()) {
    if (breakdown.points <= 0) {
      continue;
    }

    const existingExtras = extraPointsByMember.get(memberId) ?? [];
    existingExtras.push({
      id: `dark-horse-${memberId}`,
      label: "Dark Horse",
      detail: `${breakdown.teamName} · ${formatProgressLabel(breakdown.progress)} · ${breakdown.teamTier}`,
      points: breakdown.points,
      category: "dark_horse",
      kickoffAt: null,
    });
    extraPointsByMember.set(memberId, existingExtras);
  }

  for (const [memberId, breakdown] of standingsSource.goldenBootBreakdownByMember.entries()) {
    if (breakdown.points <= 0) {
      continue;
    }

    const existingExtras = extraPointsByMember.get(memberId) ?? [];
    existingExtras.push({
      id: `golden-boot-${memberId}`,
      label: "Golden Boot",
      detail: `Predicción: ${breakdown.playerName}`,
      secondaryDetail: `Ganador oficial: ${breakdown.officialWinner}`,
      points: breakdown.points,
      category: "golden_boot",
      kickoffAt: null,
    });
    extraPointsByMember.set(memberId, existingExtras);
  }

  for (const [memberId, breakdown] of standingsSource.roundOf32ProjectionBreakdownByMember.entries()) {
    if (breakdown.totalPoints <= 0) {
      continue;
    }

    const existingExtras = extraPointsByMember.get(memberId) ?? [];

    for (const item of breakdown.items) {
      if (item.points <= 0) {
        continue;
      }

      const match = matchMap.get(item.matchId);
      const projectedHomeName = item.projectedHomeTeamId
        ? teamMap.get(item.projectedHomeTeamId) ?? "Equipo"
        : "Equipo";
      const projectedAwayName = item.projectedAwayTeamId
        ? teamMap.get(item.projectedAwayTeamId) ?? "Equipo"
        : "Equipo";
      const homeName = teamMap.get(item.officialHomeTeamId) ?? "Home team";
      const awayName = teamMap.get(item.officialAwayTeamId) ?? "Away team";

      existingExtras.push({
        id: `round-of-32-${memberId}-${item.matchId}`,
        label: "Cruce proyectado",
        detail: `Pronosticado: ${projectedHomeName} vs ${projectedAwayName}`,
        secondaryDetail: `Real dieciseisavos: ${homeName} vs ${awayName}`,
        points: item.points,
        category: "projection_bonus",
        kickoffAt: match?.kickoff_at ?? null,
      });
    }

    extraPointsByMember.set(memberId, existingExtras);
  }

  const playersWithPrizes = standingsSource.playerSummaries.map((player, index) => ({
    ...player,
    rank: index + 1,
    specialPrize: getClosingPrize(index + 1, standingsSource.playerSummaries.length),
  }));

  const darkHorseGallery = playersWithPrizes
    .map((player) => {
      const darkHorse = standingsSource.darkHorseBreakdownByMember.get(player.id);
      if (!darkHorse) {
        return null;
      }

      return {
        playerId: player.id,
        playerName: player.name,
        playerRank: player.rank,
        teamName: darkHorse.teamName,
        progress: darkHorse.progress,
        points: darkHorse.points,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.points - a.points || a.playerRank - b.playerRank || a.playerName.localeCompare(b.playerName));

  const goldenBootGallery = playersWithPrizes
    .map((player) => {
      const prediction = goldenBootPredictions?.find((item) => item.member_id === player.id);
      const payload = prediction?.payload;
      const goldenBootPick =
        payload &&
        typeof payload === "object" &&
        "playerName" in payload &&
        typeof payload.playerName === "string"
          ? payload.playerName.trim()
          : "";

      if (!goldenBootPick) {
        return null;
      }

      return {
        playerId: player.id,
        playerName: player.name,
        playerRank: player.rank,
        goldenBootPick,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.playerRank - b.playerRank || a.playerName.localeCompare(b.playerName));

  return {
    leagueId: league.id,
    players: playersWithPrizes,
    playerPredictions: Object.fromEntries(standingsSource.predictionsByMember),
    playerExtraPoints: Object.fromEntries(extraPointsByMember),
    darkHorseGallery,
    goldenBootGallery,
  };
}
