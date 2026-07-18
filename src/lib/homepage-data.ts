import { PRIMARY_LEAGUE_NAME, PRIMARY_LEAGUE_SLUG } from "@/lib/app-config";
import { getResolvedMatchStatus, isUpcomingMatchStatus } from "@/lib/match-status";
import { calculateMatchPoints } from "@/lib/scoring";
import { calculateDarkHorsePointsByMember } from "@/lib/server-bonus-scoring";
import { hasSupabaseEnv as hasSupabaseClientEnv, supabase } from "@/lib/supabase";
import type { Stage } from "@/lib/types";

export type HomePageMatch = {
  id: string;
  home: string;
  away: string;
  date: string;
  time: string;
  stage: string;
  venue: string;
  poolActivity: number;
  kickoffAt: string;
  status?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  matchMinute?: number | null;
};

export type HomePageLeaderboardEntry = {
  rank: number;
  name: string;
  points: number;
  trend: string;
  completion: number;
};

export type HomePageData = {
  leagueName: string;
  leagueDescription: string;
  tournamentName: string;
  featuredMatch: HomePageMatch;
  upcomingMatches: HomePageMatch[];
  leaderboard: HomePageLeaderboardEntry[];
  predictionCompletion: number;
  stats: {
    players: string;
    teams: string;
    matches: string;
  };
};

type PredictionScoreRow = {
  bonus_points?: number | null;
};

type PredictionRow = {
  member_id: string;
  match_id: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  prediction_scores: PredictionScoreRow | PredictionScoreRow[] | null;
};

const fallbackMatches: HomePageMatch[] = [
  {
    id: "1",
    home: "Mexico",
    away: "South Africa",
    date: "Jun 11",
    time: "19:00",
    stage: "Group Stage",
    venue: "Estadio Azteca",
    poolActivity: 40,
    kickoffAt: "2026-06-11T19:00:00Z",
    status: "scheduled",
  },
  {
    id: "2",
    home: "South Korea",
    away: "Czech Republic",
    date: "Jun 12",
    time: "02:00",
    stage: "Group Stage",
    venue: "Toronto Stadium",
    poolActivity: 58,
    kickoffAt: "2026-06-12T02:00:00Z",
    status: "scheduled",
  },
  {
    id: "3",
    home: "Canada",
    away: "Bosnia and Herzegovina",
    date: "Jun 12",
    time: "19:00",
    stage: "Group Stage",
    venue: "BC Place",
    poolActivity: 44,
    kickoffAt: "2026-06-12T19:00:00Z",
    status: "scheduled",
  },
];

const fallbackLeaderboard: HomePageLeaderboardEntry[] = [
  { rank: 1, name: "Luisa", points: 42, trend: "+8", completion: 94 },
  { rank: 2, name: "Carlos", points: 37, trend: "+5", completion: 86 },
  { rank: 3, name: "Ana", points: 35, trend: "+3", completion: 82 },
];

const fallbackData: HomePageData = {
  leagueName: `${PRIMARY_LEAGUE_NAME} Quiniela`,
  leagueDescription:
    "A premium family prediction league for the 2026 World Cup with live rankings, clutch picks, sharper match drama, and a cleaner matchday rhythm.",
  tournamentName: "FIFA World Cup 2026",
  featuredMatch: fallbackMatches[0],
  upcomingMatches: fallbackMatches,
  leaderboard: fallbackLeaderboard,
  predictionCompletion: 0,
  stats: {
    players: "0",
    teams: "48",
    matches: "72",
  },
};

function hasSupabaseEnv() {
  return hasSupabaseClientEnv && supabase !== null;
}

function formatStage(stage: string): string {
  return stage
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatKickoffParts(kickoffAt: string) {
  const date = new Date(kickoffAt);

  return {
    date: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(date),
    time: new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(date),
  };
}

function extractBonusPoints(prediction: PredictionRow): number {
  if (!prediction.prediction_scores) return 0;

  if (Array.isArray(prediction.prediction_scores)) {
    return prediction.prediction_scores[0]?.bonus_points ?? 0;
  }

  return prediction.prediction_scores.bonus_points ?? 0;
}

function calculateLiveTotalPoints(prediction: PredictionRow, match?: {
  stage: string;
  home_score: number | null;
  away_score: number | null;
}) {
  if (
    !match ||
    prediction.predicted_home_score == null ||
    prediction.predicted_away_score == null ||
    match.home_score == null ||
    match.away_score == null
  ) {
    return extractBonusPoints(prediction);
  }

  const breakdown = calculateMatchPoints({
    stage: match.stage as Stage,
    predicted: {
      home: prediction.predicted_home_score,
      away: prediction.predicted_away_score,
    },
    actual: {
      home: match.home_score,
      away: match.away_score,
    },
  });

  return breakdown.points + extractBonusPoints(prediction);
}

function getTrendLabel(points: number): string {
  return points > 0 ? `+${points}` : "+0";
}

export async function getHomePageData(): Promise<HomePageData> {
  if (!hasSupabaseEnv() || !supabase) {
    return fallbackData;
  }

  try {
    const client = supabase;
    const { data: league, error: leagueError } = await client
      .from("leagues")
      .select("id,name,description")
      .eq("slug", PRIMARY_LEAGUE_SLUG)
      .single();

    if (leagueError || !league) {
      return fallbackData;
    }

    const { data: leagueTournament, error: leagueTournamentError } = await client
      .from("league_tournaments")
      .select("id,tournament_id")
      .eq("league_id", league.id)
      .limit(1)
      .single();

    if (leagueTournamentError || !leagueTournament) {
      return {
        ...fallbackData,
        leagueName: league.name,
        leagueDescription: league.description ?? fallbackData.leagueDescription,
      };
    }

    const [
      { data: tournament },
      { data: teams },
      { data: matches },
      { data: members },
      { data: profiles },
      { data: predictions },
      { data: darkHorsePredictions },
    ] = await Promise.all([
      client
        .from("tournaments")
        .select("id,name")
        .eq("id", leagueTournament.tournament_id)
        .single(),
      client
        .from("teams")
        .select("id,name")
        .eq("tournament_id", leagueTournament.tournament_id),
      client
        .from("matches")
        .select("id,stage,home_team_id,away_team_id,venue,kickoff_at,status,home_score,away_score")
        .eq("tournament_id", leagueTournament.tournament_id)
        .order("kickoff_at", { ascending: true }),
      client
        .from("league_members")
        .select("id,user_id")
        .eq("league_id", league.id),
      client
        .from("profiles")
        .select("id,display_name,full_name"),
      client
        .from("predictions")
        .select("member_id,match_id,predicted_home_score,predicted_away_score,prediction_scores(bonus_points)")
        .eq("league_id", league.id),
      client
        .from("bonus_predictions")
        .select("member_id,payload")
        .eq("league_id", league.id)
        .eq("tournament_id", leagueTournament.tournament_id)
        .eq("type", "dark_horse"),
    ]);

    const teamMap = new Map((teams ?? []).map((team) => [team.id, team.name]));
    const matchMap = new Map((matches ?? []).map((match) => [match.id, match]));
    const profileMap = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        profile.display_name ?? profile.full_name ?? "Player",
      ]),
    );
    const darkHorsePointsByMember = calculateDarkHorsePointsByMember({
      teams: teams ?? [],
      matches: matches ?? [],
      darkHorsePredictions: darkHorsePredictions ?? [],
    });

    const now = Date.now();
    const upcomingMatches = (matches ?? [])
      .map((match) => ({
        ...match,
        resolvedStatus: getResolvedMatchStatus({
          status: match.status,
          kickoffAt: match.kickoff_at,
          homeScore: match.home_score,
          awayScore: match.away_score,
          now,
        }),
      }))
      .filter((match) => isUpcomingMatchStatus(match.resolvedStatus))
      .sort((a, b) => {
        if (a.resolvedStatus === "live" && b.resolvedStatus !== "live") return -1;
        if (a.resolvedStatus !== "live" && b.resolvedStatus === "live") return 1;

        return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime();
      })
      .slice(0, 5)
      .map((match, index) => {
        const kickoff = formatKickoffParts(match.kickoff_at);
        const matchPredictions = (predictions ?? []).filter(
          (prediction) => prediction.match_id === match.id,
        );
        const memberCount = Math.max((members ?? []).length, 1);

        return {
          id: match.id,
          home: teamMap.get(match.home_team_id) ?? "Home team",
          away: teamMap.get(match.away_team_id) ?? "Away team",
          date: kickoff.date,
          time: kickoff.time,
          stage: formatStage(match.stage),
          venue:
            match.venue ??
            ["Monterrey", "Guadalajara", "Toronto", "Houston", "Los Angeles"][index] ??
            "TBD",
          poolActivity: Math.round((matchPredictions.length / memberCount) * 100),
          kickoffAt: match.kickoff_at,
          status: match.resolvedStatus,
          homeScore: match.home_score,
          awayScore: match.away_score,
          matchMinute: null,
        } satisfies HomePageMatch;
      });

    const completedMatchIds = new Set(
      (matches ?? [])
        .filter((match) => match.home_score !== null && match.away_score !== null)
        .sort(
          (a, b) =>
            new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime(),
        )
        .slice(0, 3)
        .map((match) => match.id),
    );

    const leaderboard = (members ?? [])
      .map((member) => {
        const memberPredictions = (predictions ?? []).filter(
          (prediction) => prediction.member_id === member.id,
        );

        const totalPoints = memberPredictions.reduce(
          (sum, prediction) =>
            sum + calculateLiveTotalPoints(prediction as PredictionRow, matchMap.get(prediction.match_id)),
          0,
        ) + (darkHorsePointsByMember.get(member.id)?.points ?? 0);

        const recentPoints = memberPredictions
          .filter((prediction) => completedMatchIds.has(prediction.match_id))
          .reduce(
            (sum, prediction) =>
              sum + calculateLiveTotalPoints(prediction as PredictionRow, matchMap.get(prediction.match_id)),
            0,
          );

        const totalMatches = Math.max((matches ?? []).length, 1);
        const completion = Math.min(
          100,
          Math.round((memberPredictions.length / totalMatches) * 100),
        );

        return {
          name: profileMap.get(member.user_id) ?? "Player",
          points: totalPoints,
          trend: getTrendLabel(recentPoints),
          completion,
        };
      })
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.completion - a.completion ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 5)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));

    const predictionCompletion = leaderboard.length
      ? Math.round(
          leaderboard.reduce((sum, entry) => sum + entry.completion, 0) /
            leaderboard.length,
        )
      : 0;

    return {
      leagueName: league.name,
      leagueDescription: league.description ?? fallbackData.leagueDescription,
      tournamentName: tournament?.name ?? fallbackData.tournamentName,
      featuredMatch: upcomingMatches[0] ?? fallbackData.featuredMatch,
      upcomingMatches,
      leaderboard: leaderboard.length ? leaderboard : fallbackData.leaderboard,
      predictionCompletion,
      stats: {
        players: String((members ?? []).length),
        teams: String((teams ?? []).length || 48),
        matches: String((matches ?? []).length || 72),
      },
    };
  } catch (error) {
    console.error("Error loading home page data:", error);
    return fallbackData;
  }
}
