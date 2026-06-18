import { supabase } from "@/lib/supabase";
import { PRIMARY_LEAGUE_SLUG } from "@/lib/app-config";
import { normalizeMatchStatus } from "@/lib/match-status";

export type ResultsPrediction = {
  memberId: string;
  memberName: string;
  globalRank: number;
  globalPoints: number;
  matchPoints: number;
  outcomePoints: number;
  goalDifferencePoints: number;
  exactScorePoints: number;
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
  predictions: ResultsPrediction[];
};

export type ResultsPageData = {
  leagueName: string;
  tournamentName: string;
  matches: ResultsMatch[];
};

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

  const [
    { data: tournament },
    { data: teams },
    { data: matches },
    { data: predictions },
    { data: members },
    { data: profiles },
    { data: predictionScores },
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
      .select("id,stage,kickoff_at,venue,status,home_team_id,away_team_id,home_score,away_score")
      .eq("tournament_id", leagueTournament.tournament_id)
      .order("kickoff_at", { ascending: true }),

    supabase
      .from("predictions")
      .select("id,match_id,member_id,predicted_home_score,predicted_away_score"),

    supabase
      .from("league_members")
      .select("id,user_id"),

    supabase
      .from("profiles")
      .select("id,display_name"),

    supabase
      .from("prediction_scores")
      .select("prediction_id,outcome_points,goal_difference_points,exact_score_points,total_points"),
  ]);

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
      totalPoints: score.total_points ?? 0,
    },
  ]),
);

const globalTotals = new Map<string, number>();

for (const prediction of predictions ?? []) {
  const score = scoreByPrediction.get(prediction.id);
  const current = globalTotals.get(prediction.member_id) ?? 0;

  globalTotals.set(
    prediction.member_id,
    current + (score?.totalPoints ?? 0),
  );
}

const globalRanks = new Map<string, number>();

Array.from(globalTotals.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([memberId], index) => {
    globalRanks.set(memberId, index + 1);
  });

  for (const prediction of predictions ?? []) {
    const list = predictionsByMatch.get(prediction.match_id) ?? [];
    const memberId = String(prediction.member_id).trim();
    const userId = memberToUser.get(memberId);
    const memberName = userToName.get(String(userId ?? "").trim()) ?? "Unknown";

    const score = scoreByPrediction.get(prediction.id);

list.push({
  memberId,
  memberName,
  globalRank: globalRanks.get(memberId) ?? 999,
  globalPoints: globalTotals.get(memberId) ?? 0,
  matchPoints: score?.totalPoints ?? 0,
  outcomePoints: score?.outcomePoints ?? 0,
  goalDifferencePoints: score?.goalDifferencePoints ?? 0,
  exactScorePoints: score?.exactScorePoints ?? 0,
  predictedHome: prediction.predicted_home_score,
  predictedAway: prediction.predicted_away_score,
});

    predictionsByMatch.set(prediction.match_id, list);
  }

  return {
    leagueName: league.name,
    tournamentName: tournament?.name ?? "FIFA World Cup 2026",
    matches: (matches ?? []).map((match) => ({
      id: match.id,
      home: teamMap.get(match.home_team_id) ?? "Home",
      away: teamMap.get(match.away_team_id) ?? "Away",
      stage: match.stage,
      kickoffAt: match.kickoff_at,
      venue: match.venue ?? "Sede por confirmar",
      status: normalizeMatchStatus(match.status),
      homeScore: match.home_score,
      awayScore: match.away_score,
      predictions: (predictionsByMatch.get(match.id) ?? []).sort((a, b) => {
  if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
  return a.globalRank - b.globalRank;
}),
    })),
  };
}
