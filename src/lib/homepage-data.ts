import { PRIMARY_LEAGUE_NAME, PRIMARY_LEAGUE_SLUG } from "@/lib/app-config";
import { hasSupabaseEnv as hasSupabaseClientEnv, supabase } from "@/lib/supabase";

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
  total_points: number;
};

type PredictionRow = {
  id: string;
  member_id: string;
  match_id: string;
  prediction_scores: PredictionScoreRow | PredictionScoreRow[] | null;
};

const fallbackMatches: HomePageMatch[] = [
  {
    id: "1",
    home: "México",
    away: "Sudáfrica",
    date: "Jun 11",
    time: "19:00",
    stage: "Group Stage",
    venue: "Estadio Azteca",
    poolActivity: 40,
    kickoffAt: "2026-06-11T19:00:00Z",
    status: "Próximo",
  },
  {
    id: "2",
    home: "Corea del Sur",
    away: "República Checa",
    date: "Jun 12",
    time: "02:00",
    stage: "Group Stage",
    venue: "Toronto Stadium",
    poolActivity: 58,
    kickoffAt: "2026-06-12T02:00:00Z",
    status: "Próximo",
  },
  {
    id: "3",
    home: "Canadá",
    away: "Bosnia y Herzegovina",
    date: "Jun 12",
    time: "19:00",
    stage: "Group Stage",
    venue: "BC Place",
    poolActivity: 44,
    kickoffAt: "2026-06-12T19:00:00Z",
    status: "Próximo",
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

function extractTotalPoints(prediction: PredictionRow): number {
  if (!prediction.prediction_scores) return 0;

  if (Array.isArray(prediction.prediction_scores)) {
    return prediction.prediction_scores[0]?.total_points ?? 0;
  }

  return prediction.prediction_scores.total_points ?? 0;
}

function getTrendLabel(points: number): string {
  return points > 0 ? `+${points}` : "+0";
}

console.log("getHomePageData called");  

export async function getHomePageData(): Promise<HomePageData> {
  if (!hasSupabaseEnv() || !supabase) {
    return fallbackData;
  }

  const client = supabase;

  try {
    const { data: leagues, error: leagueError } = await client
  .from("leagues")
  .select("*");

console.log("ALL LEAGUES", leagues);

const league = leagues?.find(
  (l) => l.slug === PRIMARY_LEAGUE_SLUG
);

console.log("FOUND LEAGUE", league);

console.log("HOME league result", {
  league,
  leagueError,
  PRIMARY_LEAGUE_SLUG,
});

if (leagueError || !league) {
  return fallbackData;
}
const {
  data: leagueTournament,
  error: leagueTournamentError,
} = await client
  .from("league_tournaments")
  .select("id,tournament_id")
  .eq("league_id", league.id)
  .limit(1)
  .single();

console.log("HOME leagueTournament result", {
  leagueTournament,
  leagueTournamentError,
});

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
      { data: matches, error: matchesError },
      { data: members },
      { data: profiles },
      { data: predictions },
    ] = await Promise.all([
      client.from("tournaments").select("id,name").eq("id", leagueTournament.tournament_id).single(),
      client.from("teams").select("id,name").eq("tournament_id", leagueTournament.tournament_id),
      client
        .from("matches")
        .select("id,stage,home_team_id,away_team_id,venue,kickoff_at,status,home_score,away_score")
        .eq("tournament_id", leagueTournament.tournament_id)
        .order("kickoff_at", { ascending: true }),
      client.from("league_members").select("id,user_id").eq("league_id", league.id),
      client.from("profiles").select("id,display_name,full_name"),
      client
        .from("predictions")
        .select("id,member_id,match_id,prediction_scores(total_points)")
        .eq("league_id", league.id),
    ]);

    console.log("HOME RAW MATCH QUERY", {
      tournamentIdUsed: leagueTournament.tournament_id,
      matchesCount: matches?.length ?? 0,
      matchesError,
    });

    const teamMap = new Map((teams ?? []).map((team) => [team.id, team.name]));

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        profile.display_name ?? profile.full_name ?? "Player",
      ]),
    );

    const now = new Date();

const upcomingMatches = (matches ?? [])
  .filter((match) => {
  const kickoff = new Date(match.kickoff_at);

  return (
    match.status === "en Vivo" ||
    match.status === "Próximo" ||
    kickoff >= new Date()
  );
})
  .sort((a, b) => {
    if (a.status === "live" && b.status !== "live") return -1;
    if (a.status !== "live" && b.status === "live") return 1;

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
          status: match.status ?? "Próximo",
          homeScore: match.home_score,
          awayScore: match.away_score,
          matchMinute: null,
        };
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
          (sum, prediction) => sum + extractTotalPoints(prediction as PredictionRow),
          0,
        );

        const recentPoints = memberPredictions
          .filter((prediction) => completedMatchIds.has(prediction.match_id))
          .reduce(
            (sum, prediction) => sum + extractTotalPoints(prediction as PredictionRow),
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

    console.log("HOME LEADERBOARD DEBUG", {
      membersCount: members?.length ?? 0,
      profilesCount: profiles?.length ?? 0,
      predictionsCount: predictions?.length ?? 0,
      leaderboard,
    });

    const predictionCompletion = leaderboard.length
      ? Math.round(
          leaderboard.reduce((sum, entry) => sum + entry.completion, 0) /
            leaderboard.length,
        )
      : 0;

    console.log("HOME MATCHES DEBUG", {
  matchesCount: matches?.length ?? 0,
  firstMatches: matches?.slice(0, 5),
});
    return {
      leagueName: league.name,
      leagueDescription: league.description ?? fallbackData.leagueDescription,
      tournamentName: tournament?.name ?? fallbackData.tournamentName,
      featuredMatch: upcomingMatches[0] ?? fallbackData.featuredMatch,
      upcomingMatches: upcomingMatches,
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