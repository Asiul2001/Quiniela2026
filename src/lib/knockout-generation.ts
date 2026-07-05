import type { Stage } from "@/lib/types";
import { buildLogicalMatchGroups, getLogicalMatchKey } from "@/lib/match-deduplication";

export type KnockoutGenerationTemplate = {
  stage: Stage;
  matchNumber: number;
  homeSourceMatchNumber: number;
  awaySourceMatchNumber: number;
  kickoffAt: string;
  venue: string;
};

export const KNOCKOUT_GENERATION_TEMPLATES: KnockoutGenerationTemplate[] = [
  {
    stage: "round_of_16",
    matchNumber: 89,
    homeSourceMatchNumber: 73,
    awaySourceMatchNumber: 76,
    kickoffAt: "2026-07-04T17:00:00Z",
    venue: "NRG Stadium",
  },
  {
    stage: "round_of_16",
    matchNumber: 90,
    homeSourceMatchNumber: 75,
    awaySourceMatchNumber: 78,
    kickoffAt: "2026-07-04T21:00:00Z",
    venue: "Lincoln Financial Field",
  },
  {
    stage: "round_of_16",
    matchNumber: 91,
    homeSourceMatchNumber: 74,
    awaySourceMatchNumber: 77,
    kickoffAt: "2026-07-05T20:00:00Z",
    venue: "MetLife Stadium",
  },
  {
    stage: "round_of_16",
    matchNumber: 92,
    homeSourceMatchNumber: 79,
    awaySourceMatchNumber: 80,
    kickoffAt: "2026-07-06T00:00:00Z",
    venue: "Estadio Azteca",
  },
  {
    stage: "round_of_16",
    matchNumber: 93,
    homeSourceMatchNumber: 84,
    awaySourceMatchNumber: 83,
    kickoffAt: "2026-07-06T19:00:00Z",
    venue: "AT&T Stadium",
  },
  {
    stage: "round_of_16",
    matchNumber: 94,
    homeSourceMatchNumber: 82,
    awaySourceMatchNumber: 81,
    kickoffAt: "2026-07-07T00:00:00Z",
    venue: "Lumen Field",
  },
  {
    stage: "round_of_16",
    matchNumber: 95,
    homeSourceMatchNumber: 87,
    awaySourceMatchNumber: 86,
    kickoffAt: "2026-07-07T16:00:00Z",
    venue: "Mercedes-Benz Stadium",
  },
  {
    stage: "round_of_16",
    matchNumber: 96,
    homeSourceMatchNumber: 85,
    awaySourceMatchNumber: 88,
    kickoffAt: "2026-07-07T20:00:00Z",
    venue: "BC Place",
  },
  {
    stage: "quarter_final",
    matchNumber: 97,
    homeSourceMatchNumber: 89,
    awaySourceMatchNumber: 90,
    kickoffAt: "2026-07-09T19:00:00Z",
    venue: "Lincoln Financial Field",
  },
  {
    stage: "quarter_final",
    matchNumber: 98,
    homeSourceMatchNumber: 93,
    awaySourceMatchNumber: 94,
    kickoffAt: "2026-07-10T00:00:00Z",
    venue: "NRG Stadium",
  },
  {
    stage: "quarter_final",
    matchNumber: 99,
    homeSourceMatchNumber: 91,
    awaySourceMatchNumber: 92,
    kickoffAt: "2026-07-10T19:00:00Z",
    venue: "MetLife Stadium",
  },
  {
    stage: "quarter_final",
    matchNumber: 100,
    homeSourceMatchNumber: 95,
    awaySourceMatchNumber: 96,
    kickoffAt: "2026-07-11T00:00:00Z",
    venue: "Estadio Azteca",
  },
  {
    stage: "semi_final",
    matchNumber: 101,
    homeSourceMatchNumber: 97,
    awaySourceMatchNumber: 98,
    kickoffAt: "2026-07-14T19:00:00Z",
    venue: "AT&T Stadium",
  },
  {
    stage: "semi_final",
    matchNumber: 102,
    homeSourceMatchNumber: 99,
    awaySourceMatchNumber: 100,
    kickoffAt: "2026-07-15T19:00:00Z",
    venue: "Mercedes-Benz Stadium",
  },
  {
    stage: "final",
    matchNumber: 104,
    homeSourceMatchNumber: 101,
    awaySourceMatchNumber: 102,
    kickoffAt: "2026-07-19T19:00:00Z",
    venue: "MetLife Stadium",
  },
];

export function getAdvancingTeamIdFromStoredMatch(match: {
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
}) {
  if (match.home_score == null || match.away_score == null) {
    return null;
  }

  if (match.home_score > match.away_score) {
    return match.home_team_id;
  }

  if (match.away_score > match.home_score) {
    return match.away_team_id;
  }

  if (match.home_penalty_score != null && match.away_penalty_score != null) {
    if (match.home_penalty_score > match.away_penalty_score) {
      return match.home_team_id;
    }

    if (match.away_penalty_score > match.home_penalty_score) {
      return match.away_team_id;
    }
  }

  return null;
}

type MatchClient = {
  from: (table: "matches") => {
    select: (...args: any[]) => any;
    update: (...args: any[]) => any;
    insert: (...args: any[]) => any;
  };
};

type StoredKnockoutMatch = {
  id: string;
  stage: Stage;
  match_number: number | null;
  kickoff_at?: string | null;
  venue?: string | null;
  status?: string | null;
  updated_at?: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  home_penalty_score: number | null;
  away_penalty_score: number | null;
};

export async function ensureLaterKnockoutMatches(params: {
  client: MatchClient;
  tournamentId: string;
}) {
  const { data: knockoutMatches, error: knockoutMatchesError } = await params.client
    .from("matches")
    .select("id,stage,match_number,kickoff_at,venue,status,updated_at,home_team_id,away_team_id,home_score,away_score,home_penalty_score,away_penalty_score")
    .eq("tournament_id", params.tournamentId)
    .in("stage", ["round_of_32", "round_of_16", "quarter_final", "semi_final", "final"]);

  if (knockoutMatchesError) {
    throw knockoutMatchesError;
  }

  const { canonicalMatches, groupsByKey } = buildLogicalMatchGroups(
    ((knockoutMatches ?? []) as StoredKnockoutMatch[]),
  );

  const matchByNumber = new Map<number, StoredKnockoutMatch>(
    canonicalMatches
      .filter((match) => match.match_number !== null)
      .map((match) => [match.match_number as number, match] as const),
  );

  for (const template of KNOCKOUT_GENERATION_TEMPLATES) {
    const homeSourceMatch = matchByNumber.get(template.homeSourceMatchNumber);
    const awaySourceMatch = matchByNumber.get(template.awaySourceMatchNumber);

    if (!homeSourceMatch || !awaySourceMatch) {
      continue;
    }

    const homeTeamId = getAdvancingTeamIdFromStoredMatch(homeSourceMatch);
    const awayTeamId = getAdvancingTeamIdFromStoredMatch(awaySourceMatch);

    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
      continue;
    }

    const existingMatch = matchByNumber.get(template.matchNumber);

    if (existingMatch) {
      const existingRows =
        groupsByKey.get(
          getLogicalMatchKey({
            id: existingMatch.id,
            stage: template.stage,
            match_number: template.matchNumber,
          }),
        ) ?? [existingMatch];

      if (
        existingMatch.home_team_id === homeTeamId &&
        existingMatch.away_team_id === awayTeamId
      ) {
        continue;
      }

      const { error: updateError } = await params.client
        .from("matches")
        .update({
          stage: template.stage,
          kickoff_at: template.kickoffAt,
          venue: template.venue,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          home_score: null,
          away_score: null,
          home_penalty_score: null,
          away_penalty_score: null,
          status: "scheduled",
          updated_at: new Date().toISOString(),
        })
        .in(
          "id",
          existingRows.map((match) => match.id),
        );

      if (updateError) {
        throw updateError;
      }

      matchByNumber.set(template.matchNumber, {
        ...existingMatch,
        stage: template.stage,
        kickoff_at: template.kickoffAt,
        venue: template.venue,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_score: null,
        away_score: null,
        home_penalty_score: null,
        away_penalty_score: null,
        status: "scheduled",
      });
      continue;
    }

    const { data: insertedMatch, error: insertError } = await params.client
      .from("matches")
      .insert({
        tournament_id: params.tournamentId,
        stage: template.stage,
        round_number: null,
        match_number: template.matchNumber,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        venue: template.venue,
        kickoff_at: template.kickoffAt,
        status: "scheduled",
      })
      .select("id,stage,match_number,home_team_id,away_team_id,home_score,away_score,home_penalty_score,away_penalty_score")
      .single();

    if (insertError) {
      throw insertError;
    }

    matchByNumber.set(template.matchNumber, insertedMatch);
  }
}
