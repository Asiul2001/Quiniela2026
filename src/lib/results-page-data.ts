import { supabase } from "@/lib/supabase";
import { PRIMARY_LEAGUE_SLUG } from "@/lib/app-config";
import { ensureLaterKnockoutMatches } from "@/lib/knockout-generation";
import { buildLogicalMatchGroups } from "@/lib/match-deduplication";
import { normalizeMatchStatus } from "@/lib/match-status";
import { calculateMatchPoints } from "@/lib/scoring";
import { buildCanonicalLeagueStandings } from "@/lib/server-standings";
import { getSupabaseAdmin, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import type { Stage } from "@/lib/types";

export type ResultsPrediction = {
  memberId: string;
  memberName: string;
  globalRank: number;
  globalPoints: number;
  matchPoints: number;
  outcomePoints: number;
  goalDifferencePoints: number;
  exactScorePoints: number;
  bonusPoints: number;
  predictedHome: number | null;
  predictedAway: number | null;
};

export type ResultsMatch = {
  id: string;
  home: string;
  away: string;
  stage: string;
  kickoffAt: string;
  venue: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  predictions: ResultsPrediction[];
};

export type ResultsPageData = {
  leagueName: string;
  tournamentName: string;
  matches: ResultsMatch[];
};

const PAGE_SIZE = 1000;

async function fetchAllLeaguePredictions(leagueId: string) {
  const rows: Array<{
    id: string;
    league_id: string;
    match_id: string;
    member_id: string;
    predicted_home_score: number | null;
    predicted_away_score: number | null;
  }> = [];

  let from = 0;

  while (true) {
    const { data, error } = await supabase!
      .from("predictions")
      .select("id,league_id,match_id,member_id,predicted_home_score,predicted_away_score")
      .eq("league_id", leagueId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    rows.push(...(data ?? []));

    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchPredictionScoresByPredictionIds(predictionIds: string[]) {
  const rows: Array<{
    prediction_id: string;
    outcome_points: number | null;
    goal_difference_points: number | null;
    exact_score_points: number | null;
    bonus_points: number | null;
    total_points: number | null;
  }> = [];

  for (let index = 0; index < predictionIds.length; index += 200) {
    const batch = predictionIds.slice(index, index + 200);
    if (batch.length === 0) {
      continue;
    }

    const { data, error } = await supabase!
      .from("prediction_scores")
      .select("prediction_id,outcome_points,goal_difference_points,exact_score_points,bonus_points,total_points")
      .in("prediction_id", batch);

    if (error) {
      throw error;
    }

    rows.push(...(data ?? []));
  }

  return rows;
}

export async function getResultsPageData(): Promise<ResultsPageData> {
  if (!supabase) {
    return {
      leagueName: "Quiniela",
      tournamentName: "FIFA World Cup 2026",
      matches: [],
    };
  }

  const { data: league } = await supabase
    .from("leagues")
    .select("id,name")
    .eq("slug", PRIMARY_LEAGUE_SLUG)
    .single();

  if (!league) {
    return {
      leagueName: "Quiniela",
      tournamentName: "FIFA World Cup 2026",
      matches: [],
    };
  }

  const { data: leagueTournament } = await supabase
    .from("league_tournaments")
    .select("tournament_id")
    .eq("league_id", league.id)
    .limit(1)
    .single();

  if (!leagueTournament) {
    return {
      leagueName: league.name,
      tournamentName: "FIFA World Cup 2026",
      matches: [],
    };
  }

  if (hasSupabaseAdminEnv) {
    try {
      await ensureLaterKnockoutMatches({
        client: getSupabaseAdmin(),
        tournamentId: leagueTournament.tournament_id,
      });
    } catch (error) {
      console.error("Unable to ensure knockout matches before loading results page", error);
    }
  }

  const [
    { data: tournament },
    { data: teams },
    { data: matches },
    { data: members },
    { data: profiles },
    { data: darkHorsePredictions },
    { data: goldenBootPredictions },
  ] = await Promise.all([
    supabase
      .from("tournaments")
      .select("name")
      .eq("id", leagueTournament.tournament_id)
      .single(),

    supabase
      .from("teams")
      .select("id,name")
      .eq("tournament_id", leagueTournament.tournament_id),

    supabase
      .from("matches")
      .select("id,stage,match_number,kickoff_at,venue,status,updated_at,home_team_id,away_team_id,home_score,away_score,home_penalty_score,away_penalty_score")
      .eq("tournament_id", leagueTournament.tournament_id)
      .order("kickoff_at", { ascending: true }),

    supabase
      .from("league_members")
      .select("id,user_id")
      .eq("league_id", league.id),

    supabase
      .from("profiles")
      .select("id,display_name"),
    supabase
      .from("bonus_predictions")
      .select("member_id,payload")
      .eq("league_id", league.id)
      .eq("tournament_id", leagueTournament.tournament_id)
      .eq("type", "dark_horse"),
    supabase
      .from("bonus_predictions")
      .select("member_id,payload")
      .eq("league_id", league.id)
      .eq("tournament_id", leagueTournament.tournament_id)
      .eq("type", "golden_boot"),
  ]);

  const predictions = await fetchAllLeaguePredictions(league.id);
  const predictionScores = await fetchPredictionScoresByPredictionIds(predictions.map((prediction) => prediction.id));
  const { canonicalMatches, canonicalIdByMatchId } = buildLogicalMatchGroups(matches ?? []);
  const canonicalMatchById = new Map(canonicalMatches.map((match) => [String(match.id).trim(), match]));

  const teamMap = new Map((teams ?? []).map((team) => [team.id, team.name.trim()]));

  const memberToUser = new Map(
    (members ?? []).map((member) => [
      String(member.id).trim(),
      member.user_id,
    ]),
  );
  
  const userToName = new Map(
    (profiles ?? []).map((profile) => [
      String(profile.id).trim(),
      profile.display_name,
    ]),
  );

  const predictionsByMatch = new Map<string, ResultsPrediction[]>();

  const scoreByPrediction = new Map(
  (predictionScores ?? []).map((score) => [
    score.prediction_id,
    {
      outcomePoints: score.outcome_points ?? 0,
      goalDifferencePoints: score.goal_difference_points ?? 0,
      exactScorePoints: score.exact_score_points ?? 0,
      bonusPoints: score.bonus_points ?? 0,
      totalPoints: score.total_points ?? 0,
    },
  ]),
);

  const standingsSource = buildCanonicalLeagueStandings({
    members: (members ?? []).map((member) => ({ id: String(member.id).trim(), user_id: member.user_id })),
    profiles: (profiles ?? []).map((profile) => ({ id: String(profile.id).trim(), display_name: profile.display_name })),
    teams: (teams ?? []).map((team) => ({ id: team.id, name: team.name })),
    matches: (matches ?? []).map((match) => ({
      id: String(match.id).trim(),
      stage: match.stage,
      round_number: null,
      match_number: match.match_number,
      home_team_id: match.home_team_id,
      away_team_id: match.away_team_id,
      kickoff_at: match.kickoff_at,
      venue: match.venue,
      status: match.status,
      updated_at: match.updated_at,
      home_score: match.home_score,
      away_score: match.away_score,
      home_penalty_score: match.home_penalty_score,
      away_penalty_score: match.away_penalty_score,
    })),
    predictions: (predictions ?? []).map((prediction) => ({
      id: prediction.id,
      member_id: String(prediction.member_id).trim(),
      match_id: String(prediction.match_id).trim(),
      predicted_home_score: prediction.predicted_home_score,
      predicted_away_score: prediction.predicted_away_score,
      prediction_scores: scoreByPrediction.has(prediction.id)
        ? { bonus_points: scoreByPrediction.get(prediction.id)?.bonusPoints ?? 0 }
        : null,
    })),
    darkHorsePredictions: (darkHorsePredictions ?? []) as Array<{
      member_id: string;
      payload: Record<string, unknown> | null;
    }>,
    goldenBootPredictions: (goldenBootPredictions ?? []) as Array<{
      member_id: string;
      payload: Record<string, unknown> | null;
    }>,
  });
  const globalTotals = new Map(
    standingsSource.playerSummaries.map((player) => [player.id, player.points]),
  );

  const globalRanks = new Map<string, number>();

  Array.from(globalTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([memberId], index) => {
      globalRanks.set(memberId, index + 1);
    });

  for (const prediction of predictions ?? []) {
    const rawMatchId = String(prediction.match_id).trim();
    const matchId = canonicalIdByMatchId.get(rawMatchId) ?? rawMatchId;
    const list = predictionsByMatch.get(matchId) ?? [];
    const memberId = String(prediction.member_id).trim();
    const userId = memberToUser.get(memberId);
    const memberName = userToName.get(String(userId ?? "").trim()) ?? "Unknown";
    const score = scoreByPrediction.get(prediction.id);
    const match = canonicalMatchById.get(matchId);
    const breakdown =
      match &&
      prediction.predicted_home_score != null &&
      prediction.predicted_away_score != null &&
      match.home_score != null &&
      match.away_score != null
        ? calculateMatchPoints({
            stage: match.stage as Stage,
            predicted: {
              home: prediction.predicted_home_score,
              away: prediction.predicted_away_score,
            },
            actual: {
              home: match.home_score,
              away: match.away_score,
            },
          })
        : null;
    const bonusPoints = score?.bonusPoints ?? 0;

    list.push({
      memberId,
      memberName,
      globalRank: globalRanks.get(memberId) ?? 999,
      globalPoints: globalTotals.get(memberId) ?? 0,
      matchPoints: breakdown?.points ?? 0,
      outcomePoints: breakdown?.outcomePointsAwarded ?? 0,
      goalDifferencePoints: breakdown?.goalDifferencePointsAwarded ?? 0,
      exactScorePoints: breakdown?.exactScorePointsAwarded ?? 0,
      bonusPoints,
      predictedHome: prediction.predicted_home_score,
      predictedAway: prediction.predicted_away_score,
    });

    predictionsByMatch.set(matchId, list);
  }

  return {
    leagueName: league.name,
    tournamentName: tournament?.name ?? "FIFA World Cup 2026",
    matches: canonicalMatches.map((match) => ({
      id: match.id,
      home: teamMap.get(match.home_team_id) ?? "Home",
      away: teamMap.get(match.away_team_id) ?? "Away",
      stage: match.stage,
      kickoffAt: match.kickoff_at,
      venue: match.venue ?? "Sede por confirmar",
      status: normalizeMatchStatus(match.status),
      homeScore: match.home_score,
      awayScore: match.away_score,
      homePenaltyScore: match.home_penalty_score,
      awayPenaltyScore: match.away_penalty_score,
      predictions: (predictionsByMatch.get(String(match.id).trim()) ?? []).sort((a, b) => {
  if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
  return a.globalRank - b.globalRank;
}),
    })),
  };
}
