import { NextResponse } from "next/server";
import { ensureLaterKnockoutMatches } from "@/lib/knockout-generation";
import { calculateMatchPoints } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";
import type { Stage } from "@/lib/types";

type RoundOf32PreviewSlot =
  | {
      kind: "position";
      slotCode: string;
    }
  | {
      kind: "bestThird";
      allowedGroupCodes: string[];
    };

type RoundOf32PreviewTemplate = {
  matchNumber: number;
  homeSlot: RoundOf32PreviewSlot;
  awaySlot: RoundOf32PreviewSlot;
};

type GroupTableEntry = {
  teamId: string;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

const ROUND_OF_32_PREVIEW_TEMPLATES: RoundOf32PreviewTemplate[] = [
  { matchNumber: 73, homeSlot: { kind: "position", slotCode: "A2" }, awaySlot: { kind: "position", slotCode: "B2" } },
  { matchNumber: 74, homeSlot: { kind: "position", slotCode: "E1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["A", "B", "C", "D", "F"] } },
  { matchNumber: 75, homeSlot: { kind: "position", slotCode: "F1" }, awaySlot: { kind: "position", slotCode: "C2" } },
  { matchNumber: 76, homeSlot: { kind: "position", slotCode: "C1" }, awaySlot: { kind: "position", slotCode: "F2" } },
  { matchNumber: 77, homeSlot: { kind: "position", slotCode: "I1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["C", "D", "F", "G", "H"] } },
  { matchNumber: 78, homeSlot: { kind: "position", slotCode: "E2" }, awaySlot: { kind: "position", slotCode: "I2" } },
  { matchNumber: 79, homeSlot: { kind: "position", slotCode: "A1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["C", "E", "F", "H", "I"] } },
  { matchNumber: 80, homeSlot: { kind: "position", slotCode: "L1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["E", "H", "I", "J", "K"] } },
  { matchNumber: 81, homeSlot: { kind: "position", slotCode: "D1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["B", "E", "F", "I", "J"] } },
  { matchNumber: 82, homeSlot: { kind: "position", slotCode: "G1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["A", "E", "H", "I", "J"] } },
  { matchNumber: 83, homeSlot: { kind: "position", slotCode: "K2" }, awaySlot: { kind: "position", slotCode: "L2" } },
  { matchNumber: 84, homeSlot: { kind: "position", slotCode: "H1" }, awaySlot: { kind: "position", slotCode: "J2" } },
  { matchNumber: 85, homeSlot: { kind: "position", slotCode: "B1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["E", "F", "G", "I", "J"] } },
  { matchNumber: 86, homeSlot: { kind: "position", slotCode: "J1" }, awaySlot: { kind: "position", slotCode: "H2" } },
  { matchNumber: 87, homeSlot: { kind: "position", slotCode: "K1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["D", "E", "I", "J", "L"] } },
  { matchNumber: 88, homeSlot: { kind: "position", slotCode: "D2" }, awaySlot: { kind: "position", slotCode: "G2" } },
];


function deriveGroupCode(matchNumber: number | null) {
  if (matchNumber === null || matchNumber <= 0) {
    return null;
  }

  const groupIndex = Math.floor((matchNumber - 1) / 6);
  return String.fromCharCode(65 + groupIndex);
}

function createGroupEntry(teamId: string): GroupTableEntry {
  return {
    teamId,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
  };
}

function sortGroupEntries(
  entries: GroupTableEntry[],
  groupMatches: Array<{ id: string; home_team_id: string; away_team_id: string }>,
  draftsByMatchId: Map<string, { home: number; away: number }>,
) {
  const baseOrdered = [...entries].sort((a, b) => {
    return (
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.teamId.localeCompare(b.teamId)
    );
  });

  const getHeadToHeadStats = (tiedTeamIds: string[]) => {
    const tieStats = new Map<string, GroupTableEntry>();

    for (const teamId of tiedTeamIds) {
      tieStats.set(teamId, createGroupEntry(teamId));
    }

    for (const match of groupMatches) {
      if (!tieStats.has(match.home_team_id) || !tieStats.has(match.away_team_id)) {
        continue;
      }

      const draft = draftsByMatchId.get(match.id);
      if (!draft) {
        continue;
      }

      const homeStats = tieStats.get(match.home_team_id)!;
      const awayStats = tieStats.get(match.away_team_id)!;

      homeStats.goalsFor += draft.home;
      homeStats.goalsAgainst += draft.away;
      homeStats.goalDifference = homeStats.goalsFor - homeStats.goalsAgainst;

      awayStats.goalsFor += draft.away;
      awayStats.goalsAgainst += draft.home;
      awayStats.goalDifference = awayStats.goalsFor - awayStats.goalsAgainst;

      if (draft.home > draft.away) {
        homeStats.points += 3;
      } else if (draft.away > draft.home) {
        awayStats.points += 3;
      } else {
        homeStats.points += 1;
        awayStats.points += 1;
      }
    }

    return tieStats;
  };

  const sortedEntries: GroupTableEntry[] = [];
  let index = 0;

  while (index < baseOrdered.length) {
    const current = baseOrdered[index];
    const tieGroup = [current];
    let nextIndex = index + 1;

    while (
      nextIndex < baseOrdered.length &&
      baseOrdered[nextIndex].points === current.points &&
      baseOrdered[nextIndex].goalDifference === current.goalDifference &&
      baseOrdered[nextIndex].goalsFor === current.goalsFor
    ) {
      tieGroup.push(baseOrdered[nextIndex]);
      nextIndex += 1;
    }

    if (tieGroup.length > 1) {
      const tieStats = getHeadToHeadStats(tieGroup.map((entry) => entry.teamId));

      tieGroup.sort((a, b) => {
        const aHead = tieStats.get(a.teamId)!;
        const bHead = tieStats.get(b.teamId)!;

        return (
          bHead.points - aHead.points ||
          bHead.goalDifference - aHead.goalDifference ||
          bHead.goalsFor - aHead.goalsFor ||
          a.teamId.localeCompare(b.teamId)
        );
      });
    }

    sortedEntries.push(...tieGroup);
    index = nextIndex;
  }

  return sortedEntries;
}

function assignBestThirdPreviewSlots(
  templates: RoundOf32PreviewTemplate[],
  qualifiedThirds: Array<{ groupCode: string; teamId: string }>,
) {
  const slots = templates.flatMap((template) => {
    const resolved: Array<{ key: string; allowedGroupCodes: string[] }> = [];

    if (template.homeSlot.kind === "bestThird") {
      resolved.push({
        key: `${template.matchNumber}-home`,
        allowedGroupCodes: template.homeSlot.allowedGroupCodes,
      });
    }

    if (template.awaySlot.kind === "bestThird") {
      resolved.push({
        key: `${template.matchNumber}-away`,
        allowedGroupCodes: template.awaySlot.allowedGroupCodes,
      });
    }

    return resolved;
  });

  const orderedSlots = [...slots].sort((left, right) => {
    const leftCount = qualifiedThirds.filter((team) => left.allowedGroupCodes.includes(team.groupCode)).length;
    const rightCount = qualifiedThirds.filter((team) => right.allowedGroupCodes.includes(team.groupCode)).length;

    return leftCount - rightCount || left.key.localeCompare(right.key);
  });

  function search(
    index: number,
    usedGroups: Set<string>,
    currentAssignments: Map<string, { groupCode: string; teamId: string }>,
  ): Map<string, { groupCode: string; teamId: string }> {
    if (index >= orderedSlots.length) {
      return new Map(currentAssignments);
    }

    const slot = orderedSlots[index];
    const candidates = qualifiedThirds.filter(
      (team) => !usedGroups.has(team.groupCode) && slot.allowedGroupCodes.includes(team.groupCode),
    );

    let bestResult = new Map(currentAssignments);

    for (const candidate of candidates) {
      usedGroups.add(candidate.groupCode);
      currentAssignments.set(slot.key, candidate);

      const result = search(index + 1, usedGroups, currentAssignments);
      if (result.size > bestResult.size) {
        bestResult = result;
      }
      if (bestResult.size === orderedSlots.length) {
        usedGroups.delete(candidate.groupCode);
        currentAssignments.delete(slot.key);
        return bestResult;
      }

      usedGroups.delete(candidate.groupCode);
      currentAssignments.delete(slot.key);
    }

    const skippedResult = search(index + 1, usedGroups, currentAssignments);
    if (skippedResult.size > bestResult.size) {
      bestResult = skippedResult;
    }

    return bestResult;
  }

  return search(0, new Set<string>(), new Map<string, { groupCode: string; teamId: string }>());
}

function getActualAdvancingSide(params: {
  stage: Stage;
  homeScore: number;
  awayScore: number;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
}) {
  if (params.homeScore > params.awayScore) {
    return "home" as const;
  }

  if (params.awayScore > params.homeScore) {
    return "away" as const;
  }

  if (params.stage === "group") {
    return null;
  }

  if (params.homePenaltyScore != null && params.awayPenaltyScore != null) {
    if (params.homePenaltyScore > params.awayPenaltyScore) return "home" as const;
    if (params.awayPenaltyScore > params.homePenaltyScore) return "away" as const;
  }

  return null;
}

function getPredictedAdvancingSide(params: {
  stage: Stage;
  homeScore: number;
  awayScore: number;
  predictedPenaltyWinner: "home" | "away" | null;
}) {
  if (params.homeScore > params.awayScore) {
    return "home" as const;
  }

  if (params.awayScore > params.homeScore) {
    return "away" as const;
  }

  if (params.stage === "group") {
    return null;
  }

  return params.predictedPenaltyWinner;
}

function buildRoundOf32ProjectionForMember(params: {
  groupMatches: Array<{
    id: string;
    match_number: number | null;
    home_team_id: string;
    away_team_id: string;
  }>;
  draftsByMatchId: Map<string, { home: number; away: number }>;
}) {
  const groups = new Map<
    string,
    {
      matches: Array<{ id: string; home_team_id: string; away_team_id: string }>;
      teamMap: Map<string, GroupTableEntry>;
    }
  >();

  for (const match of params.groupMatches) {
    const groupCode = deriveGroupCode(match.match_number);
    if (!groupCode) {
      continue;
    }

    const group = groups.get(groupCode) ?? { matches: [], teamMap: new Map<string, GroupTableEntry>() };
    const draft = params.draftsByMatchId.get(match.id) ?? { home: 0, away: 0 };

    const ensureTeam = (teamId: string) => {
      if (!group.teamMap.has(teamId)) {
        group.teamMap.set(teamId, createGroupEntry(teamId));
      }
      return group.teamMap.get(teamId)!;
    };

    const homeEntry = ensureTeam(match.home_team_id);
    const awayEntry = ensureTeam(match.away_team_id);

    homeEntry.goalsFor += draft.home;
    homeEntry.goalsAgainst += draft.away;
    homeEntry.goalDifference = homeEntry.goalsFor - homeEntry.goalsAgainst;

    awayEntry.goalsFor += draft.away;
    awayEntry.goalsAgainst += draft.home;
    awayEntry.goalDifference = awayEntry.goalsFor - awayEntry.goalsAgainst;

    if (draft.home > draft.away) {
      homeEntry.points += 3;
    } else if (draft.away > draft.home) {
      awayEntry.points += 3;
    } else {
      homeEntry.points += 1;
      awayEntry.points += 1;
    }

    group.matches.push({
      id: match.id,
      home_team_id: match.home_team_id,
      away_team_id: match.away_team_id,
    });
    groups.set(groupCode, group);
  }

  const projectedTeams = new Map<string, string>();
  const thirdPlaces: Array<GroupTableEntry & { groupCode: string }> = [];

  for (const [groupCode, group] of groups.entries()) {
    const ordered = sortGroupEntries(
      Array.from(group.teamMap.values()),
      group.matches,
      params.draftsByMatchId,
    );

    if (ordered[0]) {
      projectedTeams.set(`${groupCode}1`, ordered[0].teamId);
    }
    if (ordered[1]) {
      projectedTeams.set(`${groupCode}2`, ordered[1].teamId);
    }
    if (ordered[2]) {
      projectedTeams.set(`${groupCode}3`, ordered[2].teamId);
      thirdPlaces.push({ ...ordered[2], groupCode });
    }
  }

  const qualifiedThirds = thirdPlaces
    .sort((a, b) => {
      return (
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.groupCode.localeCompare(b.groupCode)
      );
    })
    .slice(0, 8)
    .map((entry) => ({
      groupCode: entry.groupCode,
      teamId: entry.teamId,
    }));

  const assignedThirds = assignBestThirdPreviewSlots(ROUND_OF_32_PREVIEW_TEMPLATES, qualifiedThirds);

  return new Map(
    ROUND_OF_32_PREVIEW_TEMPLATES.map((template) => {
      const resolveSlot = (slot: RoundOf32PreviewSlot, side: "home" | "away") => {
        if (slot.kind === "position") {
          return projectedTeams.get(slot.slotCode) ?? null;
        }

        return assignedThirds.get(`${template.matchNumber}-${side}`)?.teamId ?? null;
      };

      return [
        template.matchNumber,
        {
          homeTeamId: resolveSlot(template.homeSlot, "home"),
          awayTeamId: resolveSlot(template.awaySlot, "away"),
        },
      ] as const;
    }),
  );
}

async function getRoundOf32ClassificationBonuses(params: {
  tournamentId: string;
  matchNumber: number | null;
  currentHomeTeamId: string;
  currentAwayTeamId: string;
  memberIds: string[];
}) {
  if (params.matchNumber === null || params.memberIds.length === 0 || !supabase) {
    return new Map<string, number>();
  }

  const [{ data: groupMatches, error: groupMatchesError }, { data: roundOf32Matches, error: roundOf32MatchesError }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("id,match_number,home_team_id,away_team_id")
        .eq("tournament_id", params.tournamentId)
        .eq("stage", "group")
        .order("match_number", { ascending: true }),
      supabase
        .from("matches")
        .select("home_team_id,away_team_id")
        .eq("tournament_id", params.tournamentId)
        .eq("stage", "round_of_32"),
    ]);

  if (groupMatchesError) {
    throw groupMatchesError;
  }

  if (roundOf32MatchesError) {
    throw roundOf32MatchesError;
  }

  const actualQualifiedTeamIds = new Set<string>();
  for (const match of roundOf32Matches ?? []) {
    actualQualifiedTeamIds.add(match.home_team_id);
    actualQualifiedTeamIds.add(match.away_team_id);
  }

  const { data: groupPredictions, error: groupPredictionsError } = await supabase
    .from("predictions")
    .select("member_id,match_id,predicted_home_score,predicted_away_score")
    .in("member_id", params.memberIds)
    .in(
      "match_id",
      (groupMatches ?? []).map((match) => match.id),
    );

  if (groupPredictionsError) {
    throw groupPredictionsError;
  }

  const draftsByMember = new Map<string, Map<string, { home: number; away: number }>>();

  for (const prediction of groupPredictions ?? []) {
    const memberDrafts = draftsByMember.get(prediction.member_id) ?? new Map<string, { home: number; away: number }>();
    memberDrafts.set(prediction.match_id, {
      home: prediction.predicted_home_score ?? 0,
      away: prediction.predicted_away_score ?? 0,
    });
    draftsByMember.set(prediction.member_id, memberDrafts);
  }

  const bonuses = new Map<string, number>();

  for (const memberId of params.memberIds) {
    const projection = buildRoundOf32ProjectionForMember({
      groupMatches: groupMatches ?? [],
      draftsByMatchId: draftsByMember.get(memberId) ?? new Map<string, { home: number; away: number }>(),
    }).get(params.matchNumber);

    if (!projection) {
      bonuses.set(memberId, 0);
      continue;
    }

    let bonus = 0;

    if (projection.homeTeamId) {
      if (projection.homeTeamId === params.currentHomeTeamId) {
        bonus += 2;
      } else if (actualQualifiedTeamIds.has(projection.homeTeamId)) {
        bonus += 1;
      }
    }

    if (projection.awayTeamId) {
      if (projection.awayTeamId === params.currentAwayTeamId) {
        bonus += 2;
      } else if (actualQualifiedTeamIds.has(projection.awayTeamId)) {
        bonus += 1;
      }
    }

    bonuses.set(memberId, bonus);
  }

  return bonuses;
}

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const {
    matchId,
    homeScore,
    awayScore,
    homePenaltyScore,
    awayPenaltyScore,
    status,
  } = body;

  if (!matchId || !Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
    return NextResponse.json(
      {
        error: "Missing or invalid score data",
        received: body,
      },
      { status: 400 },
    );
  }

  const normalizedHomePenaltyScore = Number.isFinite(homePenaltyScore) ? Number(homePenaltyScore) : null;
  const normalizedAwayPenaltyScore = Number.isFinite(awayPenaltyScore) ? Number(awayPenaltyScore) : null;

  const { data: updatedMatch, error: matchUpdateError } = await supabase
    .from("matches")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      home_penalty_score: normalizedHomePenaltyScore,
      away_penalty_score: normalizedAwayPenaltyScore,
      status: status ?? "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select("id,tournament_id,stage,match_number,home_team_id,away_team_id,home_score,away_score,home_penalty_score,away_penalty_score,status")
    .single();

  if (matchUpdateError) {
    console.error("RESULT UPDATE ERROR", matchUpdateError);

    return NextResponse.json(
      { error: matchUpdateError.message },
      { status: 500 },
    );
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select("id,member_id,predicted_home_score,predicted_away_score,predicted_penalty_winner")
    .eq("match_id", matchId);

  if (predictionsError) {
    console.error("PREDICTIONS FETCH ERROR", predictionsError);

    return NextResponse.json(
      { error: predictionsError.message },
      { status: 500 },
    );
  }

  const actualAdvancingSide = getActualAdvancingSide({
    stage: updatedMatch.stage as Stage,
    homeScore,
    awayScore,
    homePenaltyScore: normalizedHomePenaltyScore,
    awayPenaltyScore: normalizedAwayPenaltyScore,
  });

  let roundOf32Bonuses = new Map<string, number>();

  if ((updatedMatch.stage as Stage) === "round_of_32") {
    roundOf32Bonuses = await getRoundOf32ClassificationBonuses({
      tournamentId: updatedMatch.tournament_id,
      matchNumber: updatedMatch.match_number,
      currentHomeTeamId: updatedMatch.home_team_id,
      currentAwayTeamId: updatedMatch.away_team_id,
      memberIds: (predictions ?? []).map((prediction) => prediction.member_id),
    });
  }

  const scoreRows = (predictions ?? []).map((prediction) => {
    const breakdown = calculateMatchPoints({
      stage: updatedMatch.stage as Stage,
      predicted: {
        home: prediction.predicted_home_score,
        away: prediction.predicted_away_score,
      },
      actual: {
        home: homeScore,
        away: awayScore,
      },
    });

    let bonusPoints = 0;

    if ((updatedMatch.stage as Stage) === "round_of_32") {
      bonusPoints += roundOf32Bonuses.get(prediction.member_id) ?? 0;
    }

    if (["round_of_16", "quarter_final", "semi_final"].includes(updatedMatch.stage)) {
      const predictedAdvancingSide = getPredictedAdvancingSide({
        stage: updatedMatch.stage as Stage,
        homeScore: prediction.predicted_home_score,
        awayScore: prediction.predicted_away_score,
        predictedPenaltyWinner:
          prediction.predicted_penalty_winner === "home" || prediction.predicted_penalty_winner === "away"
            ? prediction.predicted_penalty_winner
            : null,
      });

      if (actualAdvancingSide && predictedAdvancingSide === actualAdvancingSide) {
        bonusPoints += 1;
      }
    }

    return {
      prediction_id: prediction.id,
      outcome_points: breakdown.outcomePointsAwarded,
      goal_difference_points: breakdown.goalDifferencePointsAwarded,
      exact_score_points: breakdown.exactScorePointsAwarded,
      bonus_points: bonusPoints,
      total_points: breakdown.points + bonusPoints,
    };
  });

  if (scoreRows.length > 0) {
    const { error: scoresError } = await supabase
      .from("prediction_scores")
      .upsert(scoreRows, {
        onConflict: "prediction_id",
      });

    if (scoresError) {
      console.error("PREDICTION SCORES UPSERT ERROR", scoresError);

      return NextResponse.json(
        { error: scoresError.message },
        { status: 500 },
      );
    }
  }

  if (["round_of_32", "round_of_16", "quarter_final", "semi_final"].includes(updatedMatch.stage)) {
    await ensureLaterKnockoutMatches({
      client: supabase,
      tournamentId: updatedMatch.tournament_id,
    });
  }

  return NextResponse.json({
    match: updatedMatch,
    scoredPredictions: scoreRows.length,
  });
}
