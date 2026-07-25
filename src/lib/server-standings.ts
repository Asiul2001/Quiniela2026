import { buildLogicalMatchGroups } from "@/lib/match-deduplication";
import { calculateMatchPoints } from "@/lib/scoring";
import {
  calculateDarkHorsePointsByMember,
  calculateGoldenBootPointsByMember,
  calculateRoundOf32ProjectionBonusesByMember,
} from "@/lib/server-bonus-scoring";
import type { Stage, TeamTier } from "@/lib/types";

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

type PredictionRow = {
  id: string;
  member_id: string;
  match_id: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  updated_at?: string | null;
  prediction_scores?: PredictionScoreShape;
};

type MemberRow = {
  id: string;
  user_id: string;
};

type ProfileRow = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
};

type TeamRow = {
  id: string;
  name: string;
  team_tier?: TeamTier | null;
};

type MatchRow = {
  id: string;
  stage: Stage;
  round_number: number | null;
  match_number: number | null;
  home_team_id: string;
  away_team_id: string;
  kickoff_at?: string | null;
  venue?: string | null;
  status?: string | null;
  updated_at?: string | null;
  home_score: number | null;
  away_score: number | null;
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

type ProjectionBonusItem = {
  points?: number;
  matchId: string;
};

export type CanonicalPlayerSummary = {
  id: string;
  userId: string;
  name: string;
  points: number;
  completion: number;
  predictionsCount: number;
  breakdown: {
    matchPoints: number;
    extraPoints: number;
    darkHorsePoints: number;
    goldenBootPoints: number;
    projectionPoints: number;
  };
};

function getPredictionScore(predictionScores: PredictionScoreShape | undefined) {
  if (!predictionScores) {
    return { totalPoints: 0, bonusPoints: 0 };
  }

  const row = Array.isArray(predictionScores) ? predictionScores[0] : predictionScores;

  return {
    totalPoints: row?.total_points ?? 0,
    bonusPoints: row?.bonus_points ?? 0,
  };
}

function getTimestampRank(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function buildCanonicalLeagueStandings(params: {
  members: MemberRow[];
  profiles: ProfileRow[];
  teams: TeamRow[];
  matches: MatchRow[];
  predictions: PredictionRow[];
  darkHorsePredictions: DarkHorsePredictionRow[];
  goldenBootPredictions: GoldenBootPredictionRow[];
}) {
  const { canonicalMatches, canonicalIdByMatchId } = buildLogicalMatchGroups(params.matches);
  const teamMap = new Map(params.teams.map((team) => [team.id, team.name]));
  const profileMap = new Map(
    params.profiles.map((profile) => [
      profile.id,
      profile.display_name ?? profile.full_name ?? "Player",
    ]),
  );
  const matchMap = new Map(canonicalMatches.map((match) => [match.id, match]));
  const predictionsByMember = new Map<string, Array<Record<string, unknown>>>();
  const extraPointsByMember = new Map<string, Array<Record<string, unknown>>>();
  const canonicalPredictions = new Map<string, PredictionRow>();

  for (const prediction of params.predictions) {
    const canonicalMatchId = canonicalIdByMatchId.get(prediction.match_id) ?? prediction.match_id;
    const key = `${prediction.member_id}::${canonicalMatchId}`;
    const existing = canonicalPredictions.get(key);

    if (!existing) {
      canonicalPredictions.set(key, prediction);
      continue;
    }

    const existingUpdatedAt = getTimestampRank(existing.updated_at);
    const candidateUpdatedAt = getTimestampRank(prediction.updated_at);

    if (
      candidateUpdatedAt > existingUpdatedAt ||
      (candidateUpdatedAt === existingUpdatedAt && prediction.id.localeCompare(existing.id) > 0)
    ) {
      canonicalPredictions.set(key, prediction);
    }
  }

  const predictions = Array.from(canonicalPredictions.values());
  const darkHorseBreakdownByMember = calculateDarkHorsePointsByMember({
    teams: params.teams,
    matches: canonicalMatches,
    darkHorsePredictions: params.darkHorsePredictions,
  });
  const goldenBootBreakdownByMember = calculateGoldenBootPointsByMember({
    goldenBootPredictions: params.goldenBootPredictions,
  });
  const roundOf32ProjectionBreakdownByMember = calculateRoundOf32ProjectionBonusesByMember({
    groupMatches: canonicalMatches.filter((match) => match.stage === "group"),
    roundOf32Matches: canonicalMatches.filter((match) => match.stage === "round_of_32"),
    groupPredictions: predictions
      .filter((prediction) => {
        const canonicalMatchId = canonicalIdByMatchId.get(prediction.match_id) ?? prediction.match_id;
        return matchMap.get(canonicalMatchId)?.stage === "group";
      })
      .map((prediction) => ({
        member_id: prediction.member_id,
        match_id: canonicalIdByMatchId.get(prediction.match_id) ?? prediction.match_id,
        predicted_home_score: prediction.predicted_home_score,
        predicted_away_score: prediction.predicted_away_score,
      })),
  });

  for (const prediction of predictions) {
    const canonicalMatchId = canonicalIdByMatchId.get(prediction.match_id) ?? prediction.match_id;
    const match = matchMap.get(canonicalMatchId);
    if (!match) {
      continue;
    }

    const score = getPredictionScore(prediction.prediction_scores);
    const basePoints =
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
          }).points
        : 0;

    const playerPrediction = {
      matchId: match.id,
      home: teamMap.get(match.home_team_id) ?? "Home team",
      away: teamMap.get(match.away_team_id) ?? "Away team",
      predictedHome: prediction.predicted_home_score ?? null,
      predictedAway: prediction.predicted_away_score ?? null,
      actualHome: match.home_score ?? null,
      actualAway: match.away_score ?? null,
      stage: match.stage,
      kickoffAt: match.kickoff_at,
      venue: match.venue ?? "TBD",
      status: match.status ?? "scheduled",
      points: basePoints,
      bonusPoints: score.bonusPoints,
    };

    const existingPredictions = predictionsByMember.get(prediction.member_id) ?? [];
    existingPredictions.push(playerPrediction);
    predictionsByMember.set(prediction.member_id, existingPredictions);

    if (score.bonusPoints > 0 && match.stage !== "round_of_32") {
      const existingExtras = extraPointsByMember.get(prediction.member_id) ?? [];
      existingExtras.push({
        id: `projection-${prediction.id}`,
        points: score.bonusPoints,
        category: "projection_bonus",
        kickoffAt: match.kickoff_at,
      });
      extraPointsByMember.set(prediction.member_id, existingExtras);
    }
  }

  for (const [memberId, breakdown] of darkHorseBreakdownByMember.entries()) {
    if (breakdown.points <= 0) {
      continue;
    }

    const existingExtras = extraPointsByMember.get(memberId) ?? [];
    existingExtras.push({
      id: `dark-horse-${memberId}`,
      points: breakdown.points,
      category: "dark_horse",
      kickoffAt: null,
    });
    extraPointsByMember.set(memberId, existingExtras);
  }

  for (const [memberId, breakdown] of goldenBootBreakdownByMember.entries()) {
    if (breakdown.points <= 0) {
      continue;
    }

    const existingExtras = extraPointsByMember.get(memberId) ?? [];
    existingExtras.push({
      id: `golden-boot-${memberId}`,
      points: breakdown.points,
      category: "golden_boot",
      kickoffAt: null,
    });
    extraPointsByMember.set(memberId, existingExtras);
  }

  for (const [memberId, breakdown] of roundOf32ProjectionBreakdownByMember.entries()) {
    if (breakdown.totalPoints <= 0) {
      continue;
    }

    const existingExtras = extraPointsByMember.get(memberId) ?? [];

    for (const item of breakdown.items as ProjectionBonusItem[]) {
      if ((item.points ?? 0) <= 0) {
        continue;
      }

      const match = matchMap.get(item.matchId);
      existingExtras.push({
        id: `round-of-32-${memberId}-${item.matchId}`,
        points: item.points ?? 0,
        category: "projection_bonus",
        kickoffAt: match?.kickoff_at ?? null,
      });
    }

    extraPointsByMember.set(memberId, existingExtras);
  }

  const totalMatches = Math.max(canonicalMatches.length, 1);
  const playerSummaries = params.members
    .map((member) => {
      const memberPredictions = predictionsByMember.get(member.id) ?? [];
      const matchPoints = memberPredictions.reduce(
        (sum, prediction) => sum + (Number((prediction as { points?: number }).points) || 0),
        0,
      );
      const extraPoints = (extraPointsByMember.get(member.id) ?? []).reduce(
        (sum, item) => sum + (Number((item as { points?: number }).points) || 0),
        0,
      );
      const darkHorsePoints = darkHorseBreakdownByMember.get(member.id)?.points ?? 0;
      const goldenBootPoints = goldenBootBreakdownByMember.get(member.id)?.points ?? 0;
      const projectionPoints = (extraPointsByMember.get(member.id) ?? [])
        .filter((item) => (item as { category?: string }).category === "projection_bonus")
        .reduce((sum, item) => sum + (Number((item as { points?: number }).points) || 0), 0);

      return {
        id: member.id,
        userId: member.user_id,
        name: profileMap.get(member.user_id) ?? "Player",
        points: matchPoints + extraPoints,
        completion: Math.round((memberPredictions.length / totalMatches) * 100),
        predictionsCount: memberPredictions.length,
        breakdown: {
          matchPoints,
          extraPoints,
          darkHorsePoints,
          goldenBootPoints,
          projectionPoints,
        },
      } satisfies CanonicalPlayerSummary;
    })
    .sort((a, b) => b.points - a.points || b.completion - a.completion || a.name.localeCompare(b.name));

  return {
    canonicalMatches,
    canonicalIdByMatchId,
    canonicalPredictions: predictions,
    predictionsByMember,
    extraPointsByMember,
    darkHorseBreakdownByMember,
    goldenBootBreakdownByMember,
    roundOf32ProjectionBreakdownByMember,
    playerSummaries,
  };
}
