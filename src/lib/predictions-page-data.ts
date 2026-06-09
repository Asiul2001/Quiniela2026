import { readFile } from "node:fs/promises";
import path from "node:path";
import { PRIMARY_LEAGUE_SLUG } from "@/lib/app-config";
import { getPredictionLockState } from "@/lib/prediction-locking";
import { hasSupabaseEnv as hasSupabaseClientEnv, supabase } from "@/lib/supabase";
import type { PhaseDeadline, Stage, TeamTier } from "@/lib/types";

export type TeamOptions = {
  id: string;
  name: string;
  tier: TeamTier;
}

export type BonusPredictionOption = {
  type: "dark_horse" | "golden_boot";
  payload: Record<string, unknown>;
};

export type PredictionEntryMatch = {
  id: string;
  home: string;
  away: string;
  stageKey: Stage;
  stage: string;
  groupLabel: string | null;
  roundNumber: number | null;
  matchNumber: number | null;
  kickoffAt: string;
  kickoffDateLabel: string;
  kickoffTimeLabel: string;
  venue: string;
  lockState: "open" | "phase-creation-locked" | "match-locked";
  canCreate: boolean;
  canEdit: boolean;
  lockReason: string;
  phaseDeadlineAt: string | null;
};

export type PredictionsPageData = {
  leagueId: string;
  leagueName: string;
  bonusPredictions: BonusPredictionOption[];
  tournamentName: string;
  matches: PredictionEntryMatch[];
  initialPredictions: Record<string, { home: string; away: string }>;

  teams: TeamOptions[];
  tournamentId: string;
};

const fallbackBaseData: PredictionsPageData = {
  leagueId: "33333333-3333-3333-3333-333333333333",
  leagueName: "Familia Strassburger",
  bonusPredictions: [],
  tournamentName: "FIFA World Cup 2026",
  matches: [],
  initialPredictions: {},
  teams: [],
  tournamentId: "11111111-1111-1111-1111-111111111111", 
};

const fallbackTournamentId = "11111111-1111-1111-1111-111111111111";
let seedFallbackMatchesPromise: Promise<PredictionEntryMatch[]> | null = null;

const actualVenueByMatchNumber: Record<number, string> = {
  1: "Estadio Azteca",
  2: "Estadio Akron",
  3: "BMO Field",
  4: "SoFi Stadium",
  5: "Gillette Stadium",
  6: "BC Place",
  7: "MetLife Stadium",
  8: "Levi's Stadium",
  9: "Lincoln Financial Field",
  10: "NRG Stadium",
  11: "AT&T Stadium",
  12: "Estadio BBVA",
  13: "Hard Rock Stadium",
  14: "Mercedes-Benz Stadium",
  15: "SoFi Stadium",
  16: "Lumen Field",
  17: "MetLife Stadium",
  18: "Gillette Stadium",
  19: "GEHA Field at Arrowhead Stadium",
  20: "Levi's Stadium",
  21: "BMO Field",
  22: "AT&T Stadium",
  23: "NRG Stadium",
  24: "Estadio Azteca",
  25: "Mercedes-Benz Stadium",
  26: "SoFi Stadium",
  27: "BC Place",
  28: "Estadio Akron",
  29: "Lincoln Financial Field",
  30: "Gillette Stadium",
  31: "Levi's Stadium",
  32: "Lumen Field",
  33: "BMO Field",
  34: "GEHA Field at Arrowhead Stadium",
  35: "NRG Stadium",
  36: "Estadio BBVA",
  37: "Hard Rock Stadium",
  38: "Mercedes-Benz Stadium",
  39: "SoFi Stadium",
  40: "BC Place",
  41: "MetLife Stadium",
  42: "Lincoln Financial Field",
  43: "AT&T Stadium",
  44: "Levi's Stadium",
  45: "Gillette Stadium",
  46: "BMO Field",
  47: "NRG Stadium",
  48: "Estadio Akron",
  49: "Hard Rock Stadium",
  50: "Mercedes-Benz Stadium",
  51: "BC Place",
  52: "Lumen Field",
  53: "Estadio Azteca",
  54: "Estadio BBVA",
  55: "Lincoln Financial Field",
  56: "MetLife Stadium",
  57: "AT&T Stadium",
  58: "GEHA Field at Arrowhead Stadium",
  59: "SoFi Stadium",
  60: "Levi's Stadium",
  61: "Gillette Stadium",
  62: "BMO Field",
  63: "Lumen Field",
  64: "BC Place",
  65: "NRG Stadium",
  66: "Estadio Akron",
  67: "MetLife Stadium",
  68: "Lincoln Financial Field",
  69: "GEHA Field at Arrowhead Stadium",
  70: "AT&T Stadium",
  71: "Hard Rock Stadium",
  72: "Mercedes-Benz Stadium",
  89: "Lincoln Financial Field",
  90: "NRG Stadium",
  91: "MetLife Stadium",
  92: "Estadio Azteca",
  93: "AT&T Stadium",
  94: "Lumen Field",
  95: "Mercedes-Benz Stadium",
  96: "BC Place",
};

const supplementalRoundOf16Fixtures: Array<{
  id: string;
  stage: Stage;
  roundNumber: number | null;
  matchNumber: number;
  home: string;
  away: string;
  kickoffAt: string;
  venue: string;
}> = [
  {
    id: "supplemental-round-of-16-89",
    stage: "round_of_16",
    roundNumber: null,
    matchNumber: 89,
    home: "Winner Match 74",
    away: "Winner Match 77",
    kickoffAt: "2026-07-04T19:00:00Z",
    venue: "Lincoln Financial Field",
  },
  {
    id: "supplemental-round-of-16-90",
    stage: "round_of_16",
    roundNumber: null,
    matchNumber: 90,
    home: "Winner Match 73",
    away: "Winner Match 75",
    kickoffAt: "2026-07-04T23:00:00Z",
    venue: "NRG Stadium",
  },
  {
    id: "supplemental-round-of-16-91",
    stage: "round_of_16",
    roundNumber: null,
    matchNumber: 91,
    home: "Winner Match 76",
    away: "Winner Match 78",
    kickoffAt: "2026-07-05T19:00:00Z",
    venue: "MetLife Stadium",
  },
  {
    id: "supplemental-round-of-16-92",
    stage: "round_of_16",
    roundNumber: null,
    matchNumber: 92,
    home: "Winner Match 79",
    away: "Winner Match 80",
    kickoffAt: "2026-07-05T23:00:00Z",
    venue: "Estadio Azteca",
  },
  {
    id: "supplemental-round-of-16-93",
    stage: "round_of_16",
    roundNumber: null,
    matchNumber: 93,
    home: "Winner Match 83",
    away: "Winner Match 84",
    kickoffAt: "2026-07-06T19:00:00Z",
    venue: "AT&T Stadium",
  },
  {
    id: "supplemental-round-of-16-94",
    stage: "round_of_16",
    roundNumber: null,
    matchNumber: 94,
    home: "Winner Match 81",
    away: "Winner Match 82",
    kickoffAt: "2026-07-06T23:00:00Z",
    venue: "Lumen Field",
  },
  {
    id: "supplemental-round-of-16-95",
    stage: "round_of_16",
    roundNumber: null,
    matchNumber: 95,
    home: "Winner Match 86",
    away: "Winner Match 88",
    kickoffAt: "2026-07-07T19:00:00Z",
    venue: "Mercedes-Benz Stadium",
  },
  {
    id: "supplemental-round-of-16-96",
    stage: "round_of_16",
    roundNumber: null,
    matchNumber: 96,
    home: "Winner Match 85",
    away: "Winner Match 87",
    kickoffAt: "2026-07-07T23:00:00Z",
    venue: "BC Place",
  },
];

function hasSupabaseEnv() {
  return hasSupabaseClientEnv && supabase !== null;
}

function formatStage(stage: string): string {
  switch (stage) {
    case "group":
      return "Fase de grupos";
    case "round_of_16":
      return "Octavos de final";
    case "quarter_final":
      return "Cuartos de final";
    case "semi_final":
      return "Semifinal";
    case "final":
      return "Final";
    default:
      return stage;
  }
}

function formatKickoffDate(kickoffAt: string) {
  const kickoff = new Date(kickoffAt);

  return {
    date: new Intl.DateTimeFormat("es-MX", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(kickoff),
    time: `${new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(kickoff)} UTC`,
  };
}

function getActualVenue(matchNumber: number | null, fallbackVenue?: string | null) {
  const normalizedFallback = fallbackVenue?.trim();
  if (normalizedFallback) {
    return normalizedFallback;
  }

  if (matchNumber !== null && actualVenueByMatchNumber[matchNumber]) {
    return actualVenueByMatchNumber[matchNumber];
  }

  return "Sede por confirmar";
}

function createPredictionEntryMatch(params: {
  id: string;
  home: string;
  away: string;
  stage: Stage;
  groupLabel: string | null;
  roundNumber: number | null;
  matchNumber: number | null;
  kickoffAt: string;
  venue?: string | null;
  status: "scheduled" | "live" | "completed" | "cancelled";
  phaseDeadlines?: PhaseDeadline[];
}) {
  const kickoff = formatKickoffDate(params.kickoffAt);
  const lockWindow = getMatchWindow({
    stage: params.stage,
    kickoffAt: params.kickoffAt,
    status: params.status,
    predictionExists: false,
    phaseDeadlines: params.phaseDeadlines ?? [],
  });

  return {
    id: params.id,
    home: params.home,
    away: params.away,
    stageKey: params.stage,
    stage: formatStage(params.stage),
    groupLabel: params.groupLabel,
    roundNumber: params.roundNumber,
    matchNumber: params.matchNumber,
    kickoffAt: params.kickoffAt,
    kickoffDateLabel: kickoff.date,
    kickoffTimeLabel: kickoff.time,
    venue: getActualVenue(params.matchNumber, params.venue),
    lockState: lockWindow.state,
    canCreate: lockWindow.canCreate,
    canEdit: lockWindow.canEdit,
    lockReason: lockWindow.reason,
    phaseDeadlineAt: (params.phaseDeadlines ?? []).find((deadline) => deadline.stage === params.stage)?.deadlineAt ?? null,
  } satisfies PredictionEntryMatch;
}

function mergeSupplementalRoundOf16(matches: PredictionEntryMatch[]) {
  const existingIds = new Set(matches.map((match) => match.id));
  const hasRoundOf16 = matches.some((match) => match.stageKey === "round_of_16");

  if (hasRoundOf16) {
    return matches;
  }

  const supplementalMatches = supplementalRoundOf16Fixtures
    .filter((fixture) => !existingIds.has(fixture.id))
    .map((fixture) =>
      createPredictionEntryMatch({
        ...fixture,
        groupLabel: null,
        status: "scheduled",
      }),
    );

  return [...matches, ...supplementalMatches].sort(
    (left, right) => new Date(left.kickoffAt).getTime() - new Date(right.kickoffAt).getTime(),
  );
}

function deriveGroupAssignments(matches: Array<{ stage: Stage; homeTeamId: string; awayTeamId: string; kickoffAt: string }>) {
  const adjacency = new Map<string, Set<string>>();
  const earliestKickoff = new Map<string, number>();

  for (const match of matches) {
    if (match.stage !== "group") {
      continue;
    }

    const home = match.homeTeamId;
    const away = match.awayTeamId;
    const kickoffTime = new Date(match.kickoffAt).getTime();

    if (!adjacency.has(home)) adjacency.set(home, new Set());
    if (!adjacency.has(away)) adjacency.set(away, new Set());
    adjacency.get(home)?.add(away);
    adjacency.get(away)?.add(home);

    const updateKickoff = (teamId: string) => {
      const previous = earliestKickoff.get(teamId);
      if (previous === undefined || kickoffTime < previous) {
        earliestKickoff.set(teamId, kickoffTime);
      }
    };

    updateKickoff(home);
    updateKickoff(away);
  }

  const visited = new Set<string>();
  const groups: Array<{ teams: string[]; earliestKickoff: number }> = [];

  for (const teamId of adjacency.keys()) {
    if (visited.has(teamId)) {
      continue;
    }

    const queue = [teamId];
    const component: string[] = [teamId];
    visited.add(teamId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
          component.push(neighbor);
        }
      }
    }

    const kickoff = Math.min(
      ...component.map((id) => earliestKickoff.get(id) ?? Number.MAX_SAFE_INTEGER),
    );
    groups.push({ teams: component, earliestKickoff: kickoff });
  }

  groups.sort((a, b) => a.earliestKickoff - b.earliestKickoff);

  const groupAssignments = new Map<string, string>();
  for (let index = 0; index < groups.length; index += 1) {
    const label = `Group ${String.fromCharCode(65 + index)}`;
    for (const teamId of groups[index].teams) {
      groupAssignments.set(teamId, label);
    }
  }

  return groupAssignments;
}

function deriveGroupLabel(stage: Stage, matchNumber: number | null): string | null {
  if (stage !== "group" || matchNumber === null || matchNumber <= 0) {
    return null;
  }

  const groupIndex = Math.floor((matchNumber - 1) / 6);
  const groupLetter = String.fromCharCode(65 + groupIndex);
  return `Group ${groupLetter}`;
}

function isLocked(kickoffAt: string, status: string): boolean {
  if (status === "live" || status === "completed" || status === "cancelled") {
    return true;
  }

  return new Date(kickoffAt).getTime() <= Date.now();
}

function getMatchWindow(params: {
  stage: Stage;
  kickoffAt: string;
  status: string;
  predictionExists: boolean;
  phaseDeadlines: PhaseDeadline[];
}) {
  const phaseDeadline = params.phaseDeadlines.find((deadline) => deadline.stage === params.stage) ?? null;

  return getPredictionLockState({
    match: {
      id: params.stage,
      tournamentId: fallbackTournamentId,
      stage: params.stage,
      kickoffAt: params.kickoffAt,
      homeTeamId: "home",
      awayTeamId: "away",
      status: params.status as "scheduled" | "live" | "completed" | "cancelled",
      createdAt: params.kickoffAt,
    },
    phaseDeadline,
    predictionExists: params.predictionExists,
  });
}

async function loadSeedFallbackMatches(): Promise<PredictionEntryMatch[]> {
  const seedPath = path.join(process.cwd(), "db", "seed.supabase.sql");
  const sql = await readFile(seedPath, "utf-8");

  const teamsSectionMatch = sql.match(/insert into teams[\s\S]*?values\s*([\s\S]*?)\son conflict \(id\) do nothing;/i);
  const matchesSectionMatch = sql.match(/insert into matches[\s\S]*?values\s*([\s\S]*?)\s*$/i);

  if (!teamsSectionMatch || !matchesSectionMatch) {
    return [];
  }

  const teamMap = new Map<string, string>();
  const teamTuplePattern = /\('([^']+)','([^']+)','([^']+)','[^']+','[^']+',now\(\)\)/g;

  for (const match of teamsSectionMatch[1].matchAll(teamTuplePattern)) {
    const [, teamId, tournamentId, teamName] = match;
    if (tournamentId === fallbackTournamentId) {
      teamMap.set(teamId, teamName);
    }
  }

  const rawMatches: Array<{
    id: string;
    tournamentId: string;
    stage: Stage;
    roundNumber: number | null;
    matchNumber: number | null;
    homeTeamId: string;
    awayTeamId: string;
    kickoffAt: string;
    status: string;
  }> = [];

  const matchTuplePattern =
    /\('([^']+)','([^']+)','([^']+)',(null|\d+),(\d+),'([^']+)','([^']+)','([^']+)','([^']+)',now\(\),now\(\)\)/g;

  for (const match of matchesSectionMatch[1].matchAll(matchTuplePattern)) {
    const [, id, tournamentId, stage, roundNumberRaw, matchNumberRaw, homeTeamId, awayTeamId, kickoffAt, status] = match;

    if (tournamentId !== fallbackTournamentId) continue;
    if (status !== "scheduled" && status !== "live") continue;

    rawMatches.push({
      id,
      tournamentId,
      stage: stage as Stage,
      roundNumber: roundNumberRaw === "null" ? null : Number(roundNumberRaw),
      matchNumber: matchNumberRaw === "null" ? null : Number(matchNumberRaw),
      homeTeamId,
      awayTeamId,
      kickoffAt,
      status,
    });
  }

  const groupAssignments = deriveGroupAssignments(rawMatches);

  const parsedMatches: PredictionEntryMatch[] = rawMatches.map((match) => {
    const teamGroup = groupAssignments.get(match.homeTeamId);

    return createPredictionEntryMatch({
      id: match.id,
      home: teamMap.get(match.homeTeamId) ?? "Home team",
      away: teamMap.get(match.awayTeamId) ?? "Away team",
      stage: match.stage,
      groupLabel: teamGroup ?? deriveGroupLabel(match.stage, match.matchNumber),
      roundNumber: match.roundNumber,
      matchNumber: match.matchNumber,
      kickoffAt: match.kickoffAt,
      status: match.status as "scheduled" | "live",
    });
  });

  return mergeSupplementalRoundOf16(parsedMatches);
}

async function getFallbackData(): Promise<PredictionsPageData> {
  if (!seedFallbackMatchesPromise) {
    seedFallbackMatchesPromise = loadSeedFallbackMatches().catch(() => []);
  }

  const matches = await seedFallbackMatchesPromise;
  return {
    ...fallbackBaseData,
    matches,
  };
}

export async function getPredictionsPageData(): Promise<PredictionsPageData> {
  if (!hasSupabaseEnv()) {
    return getFallbackData();
  }

  const client = supabase;
  if (!client) {
    return getFallbackData();
  }

  try {
    const { data: league } = await client
      .from("leagues")
      .select("id,name")
      .eq("slug", PRIMARY_LEAGUE_SLUG)
      .single();

    if (!league) {
      return getFallbackData();
    }

    const { data: leagueTournament } = await client
      .from("league_tournaments")
      .select("id,tournament_id")
      .eq("league_id", league.id)
      .limit(1)
      .single();

    if (!leagueTournament) {
      return {
        ...(await getFallbackData()),
        leagueId: league.id,
        leagueName: league.name,
      };
    }

    const [{ data: tournament }, { data: teams }, { data: matches }, { data: phaseDeadlines }, { data: bonusPredictions },] = await Promise.all([
      client
        .from("tournaments")
        .select("name")
        .eq("id", leagueTournament.tournament_id)
        .single(),
      client
        .from("teams")
        .select("id,name,team_tier")
        .eq("tournament_id", leagueTournament.tournament_id),
      client
        .from("matches")
        .select("id,stage,round_number,match_number,home_team_id,away_team_id,kickoff_at,venue,status")
        .eq("tournament_id", leagueTournament.tournament_id)
        .order("kickoff_at", { ascending: true }),
      client
        .from("phase_deadlines")
        .select("stage,deadline_at")
        .eq("league_tournament_id", leagueTournament.id),
    client
      .from("bonus_predictions")
      .select("type,payload")
      .eq("league_id", league.id)
      .eq("tournament_id", leagueTournament.tournament_id),
    ]);

const teamMap = new Map((teams ?? []).map((team) => [team.id, team.name]));

const teamOptions: TeamOptions[] = (teams ?? []).map((team) => ({
  id: team.id,
  name: team.name,
  tier: team.team_tier ?? "favorite",
}));

    
    const deadlines: PhaseDeadline[] = (phaseDeadlines ?? []).map((deadline) => ({
      id: `${leagueTournament.id}-${deadline.stage}`,
      tournamentId: leagueTournament.tournament_id,
      stage: deadline.stage,
      deadlineAt: deadline.deadline_at,
      createdAt: deadline.deadline_at,
      updatedAt: deadline.deadline_at,
    }));
    const rawMatches = (matches ?? [])
      .filter((match) => match.status === "scheduled" || match.status === "live")
      .map((match) => ({
        id: match.id,
        stage: match.stage,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        kickoffAt: match.kickoff_at,
      }));

    const groupAssignments = deriveGroupAssignments(rawMatches);

    const predictionMatches = (matches ?? [])
      .filter((match) => match.status === "scheduled" || match.status === "live")
      .map((match) => {
        const matchNumber = match.match_number ?? null;
        const groupLabel = match.stage === "group"
          ? groupAssignments.get(match.home_team_id) ?? deriveGroupLabel(match.stage, matchNumber)
          : null;

        return createPredictionEntryMatch({
          id: match.id,
          home: teamMap.get(match.home_team_id) ?? "Home team",
          away: teamMap.get(match.away_team_id) ?? "Away team",
          stage: match.stage,
          groupLabel,
          roundNumber: match.round_number ?? null,
          matchNumber,
          kickoffAt: match.kickoff_at,
          venue: match.venue,
          status: match.status,
          phaseDeadlines: deadlines,
        });
      });

return {
  leagueId: league.id,
  leagueName: league.name,
  tournamentName: tournament?.name ?? fallbackBaseData.tournamentName,
  tournamentId: leagueTournament.tournament_id,
  teams: teamOptions,
  matches: predictionMatches.length
    ? mergeSupplementalRoundOf16(predictionMatches)
    : (await getFallbackData()).matches,
  initialPredictions: {},
  bonusPredictions: (bonusPredictions ?? []).map((prediction) => ({
  type: prediction.type,
  payload: prediction.payload ?? {},
})),
};

} catch (error) {
  console.error("Error fetching predictions page data:", error);
  throw error;
}
}
