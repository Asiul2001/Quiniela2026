import "server-only";
import { PRIMARY_LEAGUE_NAME, PRIMARY_LEAGUE_SLUG } from "@/lib/app-config";
import { getResolvedMatchStatus, isUpcomingMatchStatus } from "@/lib/match-status";
import { getPlayersBrowseData } from "@/lib/players-browse-data";
import { buildCanonicalLeagueStandings } from "@/lib/server-standings";
import { getSupabaseServerClient, hasSupabaseServerEnv } from "@/lib/supabase-server";
import { getClosingPrize } from "@/lib/tournament-awards";
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
  userId?: string;
  name: string;
  points: number;
  trend: string;
  completion: number;
  prize?: {
    title: string;
    definition: string;
    detail: string;
  };
};

export type HomePageDarkHorseEntry = {
  rank: number;
  playerName: string;
  teamName: string;
  progress:
    | "none"
    | "round_of_32"
    | "round_of_16"
    | "quarter_final"
    | "semi_final"
    | "final"
    | "champion";
  points: number;
};

export type HomePageGoldenBootEntry = {
  rank: number;
  playerName: string;
  goldenBootPick: string;
};

export type HomePageTournamentSummary = {
  isFinished: boolean;
  champion: string | null;
  runnerUp: string | null;
  thirdPlace: string | null;
  fourthPlace: string | null;
  finalScore: string | null;
  bronzeScore: string | null;
};

export type HomePageData = {
  leagueName: string;
  leagueDescription: string;
  tournamentName: string;
  featuredMatch: HomePageMatch;
  upcomingMatches: HomePageMatch[];
  matchFeedTitle: string;
  leaderboard: HomePageLeaderboardEntry[];
  standings: HomePageLeaderboardEntry[];
  darkHorseGallery: HomePageDarkHorseEntry[];
  goldenBootGallery: HomePageGoldenBootEntry[];
  predictionCompletion: number;
  tournamentSummary: HomePageTournamentSummary;
  stats: {
    players: string;
    teams: string;
    matches: string;
  };
};

type PredictionRow = {
  id: string;
  member_id: string;
  match_id: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  updated_at?: string | null;
  prediction_scores:
    | {
        bonus_points?: number | null;
      }
    | Array<{
        bonus_points?: number | null;
      }>
    | null;
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

const fallbackData: HomePageData = {
  leagueName: `${PRIMARY_LEAGUE_NAME} Quiniela`,
  leagueDescription:
    "A premium family prediction league for the 2026 World Cup with live rankings, clutch picks, sharper match drama, and a cleaner matchday rhythm.",
  tournamentName: "FIFA World Cup 2026",
  featuredMatch: fallbackMatches[0],
  upcomingMatches: fallbackMatches,
  matchFeedTitle: "Upcoming matches",
  leaderboard: [],
  standings: [],
  darkHorseGallery: [],
  goldenBootGallery: [],
  predictionCompletion: 0,
  tournamentSummary: {
    isFinished: false,
    champion: null,
    runnerUp: null,
    thirdPlace: null,
    fourthPlace: null,
    finalScore: null,
    bronzeScore: null,
  },
  stats: {
    players: "0",
    teams: "48",
    matches: "72",
  },
};

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

function getTrendLabel(points: number): string {
  return points > 0 ? `+${points}` : "+0";
}

function formatScoreLabel(match?: {
  home_score: number | null;
  away_score: number | null;
}) {
  if (!match || match.home_score == null || match.away_score == null) {
    return null;
  }

  return `${match.home_score}-${match.away_score}`;
}

function getWinningTeamName(params: {
  homeTeamName: string | null;
  awayTeamName: string | null;
  homeScore: number | null | undefined;
  awayScore: number | null | undefined;
}) {
  if (params.homeScore == null || params.awayScore == null) {
    return null;
  }

  if (params.homeScore > params.awayScore) {
    return params.homeTeamName;
  }

  if (params.awayScore > params.homeScore) {
    return params.awayTeamName;
  }

  return null;
}

export async function getHomePageData(): Promise<HomePageData> {
  if (!hasSupabaseServerEnv) {
    return fallbackData;
  }

  try {
    const client = getSupabaseServerClient();
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
      { data: goldenBootPredictions },
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
        .select("id,stage,round_number,match_number,home_team_id,away_team_id,venue,kickoff_at,status,updated_at,home_score,away_score,home_penalty_score,away_penalty_score")
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
        .select("id,member_id,match_id,predicted_home_score,predicted_away_score,updated_at,prediction_scores(bonus_points)")
        .eq("league_id", league.id),
      client
        .from("bonus_predictions")
        .select("member_id,payload")
        .eq("league_id", league.id)
        .eq("tournament_id", leagueTournament.tournament_id)
        .eq("type", "dark_horse"),
      client
        .from("bonus_predictions")
        .select("member_id,payload")
        .eq("league_id", league.id)
        .eq("tournament_id", leagueTournament.tournament_id)
        .eq("type", "golden_boot"),
    ]);

    const teamMap = new Map((teams ?? []).map((team) => [team.id, team.name]));
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name ?? profile.full_name ?? "Player"]));
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
      predictions: (predictions ?? []) as PredictionRow[],
      darkHorsePredictions: (darkHorsePredictions ?? []) as Array<{
        member_id: string;
        payload: Record<string, unknown> | null;
      }>,
      goldenBootPredictions: (goldenBootPredictions ?? []) as Array<{
        member_id: string;
        payload: Record<string, unknown> | null;
      }>,
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

    const completedMatches = (matches ?? [])
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
      .filter((match) => match.home_score !== null && match.away_score !== null)
      .sort(
        (a, b) =>
          new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime(),
      );

    const completedMatchIds = new Set(
      completedMatches
        .slice(0, 3)
        .map((match) => match.id),
    );

    const recentPointsByMember = new Map(
      standingsSource.playerSummaries.map((player) => {
        const memberPredictions = standingsSource.predictionsByMember.get(player.id) ?? [];
        const recentPoints = memberPredictions
          .filter((prediction) => completedMatchIds.has(String((prediction as { matchId?: string }).matchId ?? "")))
          .reduce((sum, prediction) => sum + (Number((prediction as { points?: number }).points) || 0), 0);

        return [player.id, recentPoints] as const;
      }),
    );

    const sharedPlayersPayload = await getPlayersBrowseData();
    const standings = sharedPlayersPayload.players.map((player) => ({
      rank: player.rank,
      userId: player.userId,
      name: player.name,
      points: player.points,
      trend: getTrendLabel(recentPointsByMember.get(player.id) ?? 0),
      completion: player.completion,
      prize: player.specialPrize ?? getClosingPrize(player.rank, sharedPlayersPayload.players.length),
    }));

    const leaderboard = standings.slice(0, 5);

    const predictionCompletion = sharedPlayersPayload.players.length
      ? Math.round(
          sharedPlayersPayload.players.reduce((sum, entry) => sum + entry.completion, 0) /
            sharedPlayersPayload.players.length,
        )
      : 0;

    const darkHorseGallery = sharedPlayersPayload.darkHorseGallery.map((entry) => ({
      rank: entry.playerRank,
      playerName: entry.playerName,
      teamName: entry.teamName,
      progress: entry.progress as HomePageDarkHorseEntry["progress"],
      points: entry.points,
    }));

    const goldenBootGallery = sharedPlayersPayload.goldenBootGallery.map((entry) => ({
      rank: entry.playerRank,
      playerName: entry.playerName,
      goldenBootPick: entry.goldenBootPick,
    }));

    const finalMatch = (matches ?? []).find((match) => match.stage === "final");
    const bronzeMatch = (matches ?? []).find((match) => match.stage === "third_place");
    const finalHome = finalMatch ? teamMap.get(finalMatch.home_team_id) ?? "Home team" : null;
    const finalAway = finalMatch ? teamMap.get(finalMatch.away_team_id) ?? "Away team" : null;
    const bronzeHome = bronzeMatch ? teamMap.get(bronzeMatch.home_team_id) ?? "Home team" : null;
    const bronzeAway = bronzeMatch ? teamMap.get(bronzeMatch.away_team_id) ?? "Away team" : null;
    const tournamentFinished =
      finalMatch?.home_score != null && finalMatch?.away_score != null;
    const championTeam = getWinningTeamName({
      homeTeamName: finalHome,
      awayTeamName: finalAway,
      homeScore: finalMatch?.home_score,
      awayScore: finalMatch?.away_score,
    });
    const thirdPlaceTeam = getWinningTeamName({
      homeTeamName: bronzeHome,
      awayTeamName: bronzeAway,
      homeScore: bronzeMatch?.home_score,
      awayScore: bronzeMatch?.away_score,
    });
    const fourthPlaceTeam =
      thirdPlaceTeam === bronzeHome
        ? bronzeAway
        : thirdPlaceTeam === bronzeAway
          ? bronzeHome
          : null;

    const matchFeed =
      upcomingMatches.length > 0
        ? upcomingMatches
        : completedMatches.slice(0, 5).map((match, index) => {
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

    return {
      leagueName: league.name,
      leagueDescription: league.description ?? fallbackData.leagueDescription,
      tournamentName: tournament?.name ?? fallbackData.tournamentName,
      featuredMatch: matchFeed[0] ?? fallbackData.featuredMatch,
      upcomingMatches: matchFeed,
      matchFeedTitle: upcomingMatches.length > 0 ? "Proximos juegos" : "Ultimos resultados",
      leaderboard,
      standings,
      darkHorseGallery,
      goldenBootGallery,
      predictionCompletion,
      tournamentSummary: {
        isFinished: tournamentFinished,
        champion: tournamentFinished ? championTeam : null,
        runnerUp:
          tournamentFinished && championTeam
            ? championTeam === finalHome
              ? finalAway
              : finalHome
            : null,
        thirdPlace: thirdPlaceTeam,
        fourthPlace: fourthPlaceTeam,
        finalScore: tournamentFinished && finalHome && finalAway
          ? `${finalHome} ${formatScoreLabel(finalMatch)} ${finalAway}`
          : null,
        bronzeScore: bronzeMatch?.home_score != null && bronzeMatch?.away_score != null && bronzeHome && bronzeAway
          ? `${bronzeHome} ${formatScoreLabel(bronzeMatch)} ${bronzeAway}`
          : null,
      },
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
