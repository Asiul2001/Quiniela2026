import { calculateDarkHorsePoints } from "@/lib/scoring";
import type { Stage, TeamTier } from "@/lib/types";

const OFFICIAL_GOLDEN_BOOT_WINNER = "Kylian Mbappe";
const GOLDEN_BOOT_POINTS = 5;

type TeamRow = {
  id: string;
  name: string;
  team_tier?: TeamTier | null;
  tier?: TeamTier | null;
};

type MatchRow = {
  stage: Stage;
  home_team_id: string;
  away_team_id: string;
  home_score?: number | null;
  away_score?: number | null;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
};

type DarkHorsePredictionRow = {
  member_id: string;
  payload: Record<string, unknown> | null;
};

type GoldenBootPredictionRow = {
  member_id: string;
  payload: Record<string, unknown> | null;
};

export type DarkHorseBreakdown = {
  teamId: string;
  teamName: string;
  teamTier: TeamTier;
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

export type GoldenBootBreakdown = {
  playerName: string;
  officialWinner: string;
  points: number;
};

type GroupPredictionRow = {
  member_id: string;
  match_id: string;
  predicted_home_score?: number | null;
  predicted_away_score?: number | null;
};

type GroupMatchRow = {
  id: string;
  match_number: number | null;
  home_team_id: string;
  away_team_id: string;
};

type RoundOf32MatchRow = {
  id: string;
  match_number: number | null;
  home_team_id: string;
  away_team_id: string;
};

type GroupTableEntry = {
  teamId: string;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

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

export type RoundOf32ProjectionBonusItem = {
  matchId: string;
  matchNumber: number;
  projectedHomeTeamId: string | null;
  projectedAwayTeamId: string | null;
  officialHomeTeamId: string;
  officialAwayTeamId: string;
  homePoints: number;
  awayPoints: number;
  points: number;
};

export type RoundOf32ProjectionBonusBreakdown = {
  totalPoints: number;
  items: RoundOf32ProjectionBonusItem[];
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

function buildRoundOf32ProjectionForMember(params: {
  groupMatches: GroupMatchRow[];
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
    const ordered = sortGroupEntries(Array.from(group.teamMap.values()), group.matches, params.draftsByMatchId);

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

function getRoundOf32SlotPoints(params: {
  projectedTeamId: string | null;
  officialTeamId: string;
  actualQualifiedTeamIds: Set<string>;
}) {
  if (!params.projectedTeamId) {
    return 0;
  }

  if (params.projectedTeamId === params.officialTeamId) {
    return 2;
  }

  if (params.actualQualifiedTeamIds.has(params.projectedTeamId)) {
    return 1;
  }

  return 0;
}

function getWinningTeamId(match: MatchRow) {
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

function getDarkHorseProgress(teamId: string, matches: MatchRow[]) {
  const appearsInStage = (stage: Stage) =>
    matches.some(
      (match) =>
        match.stage === stage &&
        (match.home_team_id === teamId || match.away_team_id === teamId),
    );

  const finalMatch = matches.find((match) => match.stage === "final");
  const championTeamId = finalMatch ? getWinningTeamId(finalMatch) : null;

  if (championTeamId === teamId) {
    return "champion" as const;
  }

  if (appearsInStage("final")) {
    return "final" as const;
  }

  if (appearsInStage("semi_final")) {
    return "semi_final" as const;
  }

  if (appearsInStage("quarter_final")) {
    return "quarter_final" as const;
  }

  if (appearsInStage("round_of_16")) {
    return "round_of_16" as const;
  }

  if (appearsInStage("round_of_32")) {
    return "round_of_32" as const;
  }

  return "none" as const;
}

function normalizePlayerName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getNameTokens(value: string) {
  return normalizePlayerName(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function isGoldenBootWinnerMatch(predictedName: string, officialWinner: string) {
  const normalizedPrediction = normalizePlayerName(predictedName);
  const normalizedWinner = normalizePlayerName(officialWinner);

  if (!normalizedPrediction || !normalizedWinner) {
    return false;
  }

  if (normalizedPrediction === normalizedWinner) {
    return true;
  }

  const winnerTokens = getNameTokens(officialWinner);
  const predictionTokens = getNameTokens(predictedName);
  const winnerLastName = winnerTokens.at(-1) ?? "";
  const predictionLastName = predictionTokens.at(-1) ?? "";

  if (normalizedPrediction === winnerLastName || predictionLastName === winnerLastName) {
    return true;
  }

  if (normalizedWinner.includes(normalizedPrediction) || normalizedPrediction.includes(normalizedWinner)) {
    return true;
  }

  return false;
}

export function calculateDarkHorsePointsByMember(params: {
  teams: TeamRow[];
  matches: MatchRow[];
  darkHorsePredictions: DarkHorsePredictionRow[];
}) {
  const teamMap = new Map(
    params.teams.map((team) => [
      team.id,
      {
        name: team.name,
        tier: (team.team_tier ?? team.tier ?? "favorite") as TeamTier,
      },
    ]),
  );

  const breakdownByMember = new Map<string, DarkHorseBreakdown>();

  for (const prediction of params.darkHorsePredictions) {
    const payload = prediction.payload ?? {};
    const teamId =
      payload && typeof payload === "object" && "teamId" in payload
        ? String(payload.teamId)
        : "";

    if (!teamId) {
      continue;
    }

    const team = teamMap.get(teamId);
    if (!team) {
      continue;
    }

    const progress = getDarkHorseProgress(teamId, params.matches);
    const points =
      progress === "none"
        ? 0
        : calculateDarkHorsePoints({
            teamTier: team.tier,
            progress,
          });

    breakdownByMember.set(prediction.member_id, {
      teamId,
      teamName: team.name,
      teamTier: team.tier,
      progress,
      points,
    });
  }

  return breakdownByMember;
}

export function calculateGoldenBootPointsByMember(params: {
  goldenBootPredictions: GoldenBootPredictionRow[];
  officialWinner?: string;
  pointsAwarded?: number;
}) {
  const winner = params.officialWinner ?? OFFICIAL_GOLDEN_BOOT_WINNER;
  const awardedPoints = params.pointsAwarded ?? GOLDEN_BOOT_POINTS;
  const breakdownByMember = new Map<string, GoldenBootBreakdown>();

  for (const prediction of params.goldenBootPredictions) {
    const payload = prediction.payload ?? {};
    const playerName =
      payload &&
      typeof payload === "object" &&
      "playerName" in payload &&
      typeof payload.playerName === "string"
        ? payload.playerName.trim()
        : "";

    if (!playerName) {
      continue;
    }

    const points = isGoldenBootWinnerMatch(playerName, winner) ? awardedPoints : 0;

    breakdownByMember.set(prediction.member_id, {
      playerName,
      officialWinner: winner,
      points,
    });
  }

  return breakdownByMember;
}

export function calculateRoundOf32ProjectionBonusesByMember(params: {
  groupMatches: GroupMatchRow[];
  roundOf32Matches: RoundOf32MatchRow[];
  groupPredictions: GroupPredictionRow[];
}) {
  const draftsByMember = new Map<string, Map<string, { home: number; away: number }>>();

  for (const prediction of params.groupPredictions) {
    const memberDrafts = draftsByMember.get(prediction.member_id) ?? new Map<string, { home: number; away: number }>();
    memberDrafts.set(prediction.match_id, {
      home: prediction.predicted_home_score ?? 0,
      away: prediction.predicted_away_score ?? 0,
    });
    draftsByMember.set(prediction.member_id, memberDrafts);
  }

  const actualQualifiedTeamIds = new Set<string>();
  for (const match of params.roundOf32Matches) {
    actualQualifiedTeamIds.add(match.home_team_id);
    actualQualifiedTeamIds.add(match.away_team_id);
  }

  const members = new Set(params.groupPredictions.map((prediction) => prediction.member_id));
  const breakdownByMember = new Map<string, RoundOf32ProjectionBonusBreakdown>();

  for (const memberId of members) {
    const projection = buildRoundOf32ProjectionForMember({
      groupMatches: params.groupMatches,
      draftsByMatchId: draftsByMember.get(memberId) ?? new Map<string, { home: number; away: number }>(),
    });

    const items = params.roundOf32Matches
      .filter((match): match is RoundOf32MatchRow & { match_number: number } => match.match_number !== null)
      .sort((a, b) => a.match_number - b.match_number)
      .map((match) => {
        const projected = projection.get(match.match_number);
        const homePoints = getRoundOf32SlotPoints({
          projectedTeamId: projected?.homeTeamId ?? null,
          officialTeamId: match.home_team_id,
          actualQualifiedTeamIds,
        });
        const awayPoints = getRoundOf32SlotPoints({
          projectedTeamId: projected?.awayTeamId ?? null,
          officialTeamId: match.away_team_id,
          actualQualifiedTeamIds,
        });

        return {
          matchId: match.id,
          matchNumber: match.match_number,
          projectedHomeTeamId: projected?.homeTeamId ?? null,
          projectedAwayTeamId: projected?.awayTeamId ?? null,
          officialHomeTeamId: match.home_team_id,
          officialAwayTeamId: match.away_team_id,
          homePoints,
          awayPoints,
          points: homePoints + awayPoints,
        } satisfies RoundOf32ProjectionBonusItem;
      });

    breakdownByMember.set(memberId, {
      totalPoints: items.reduce((sum, item) => sum + item.points, 0),
      items,
    });
  }

  return breakdownByMember;
}
