import { DEFAULT_STAGE_SCORING_RULES as APP_DEFAULT_STAGE_SCORING_RULES } from "@/lib/app-config";
import type {
  BonusPrediction,
  BonusPredictionType,
  DarkHorseProgress,
  Match,
  MatchOutcome,
  MatchPrediction,
  ScoreValue,
  ScoringRule,
  Stage,
  StageScoringRule,
  TeamTier,
} from "@/lib/types";

export const DEFAULT_STAGE_SCORING_RULES: Record<Stage, StageScoringRule> =
  APP_DEFAULT_STAGE_SCORING_RULES.reduce(
    (rulesByStage, rule) => {
      rulesByStage[rule.stage] = { ...rule };
      return rulesByStage;
    },
    {} as Record<Stage, StageScoringRule>,
  );

export const DARK_HORSE_MULTIPLIERS: Record<TeamTier, number> = {
  favorite: 1,
  strong_outsider: 1.5,
  dark_horse: 2,
  big_surprise: 2.5,
};

export const DARK_HORSE_PROGRESS_POINTS: Record<Exclude<DarkHorseProgress, "none">, number> = {
  round_of_32: 1,
  round_of_16: 2,
  quarter_final: 3,
  semi_final: 4,
  final: 5,
  champion: 6,
};

export type MatchScoreBreakdown = {
  stage: Stage;
  points: number;
  correctOutcome: boolean;
  correctGoalDifference: boolean;
  exactScore: boolean;
  outcomePointsAwarded: number;
  goalDifferencePointsAwarded: number;
  exactScorePointsAwarded: number;
};

export type LeaderboardScoredPrediction = {
  matchId: string;
  stage: Stage;
  points: number;
  outcomePoints: number;
  goalDifferencePoints: number;
  exactScorePoints: number;
};

export type LeaderboardMemberTotal = {
  memberId: string;
  rank: number;
  totalPoints: number;
  outcomePoints: number;
  goalDifferencePoints: number;
  exactScorePoints: number;
  scoredPredictions: number;
  predictions: LeaderboardScoredPrediction[];
};

export function getMatchOutcome(score: ScoreValue): MatchOutcome {
  if (score.home === score.away) return "draw";
  return score.home > score.away ? "home" : "away";
}

export function getGoalDifference(score: ScoreValue): number {
  return score.home - score.away;
}

export function getStageScoringRule(
  stage: Stage,
  scoringRule?: Pick<ScoringRule, "byStage"> | null,
): StageScoringRule {
  return scoringRule?.byStage?.[stage] ?? DEFAULT_STAGE_SCORING_RULES[stage];
}

export function calculateMatchPoints(params: {
  stage: Stage;
  predicted: ScoreValue;
  actual: ScoreValue;
  scoringRule?: Pick<ScoringRule, "byStage"> | null;
}): MatchScoreBreakdown {
  const { stage, predicted, actual, scoringRule } = params;
  const rule = getStageScoringRule(stage, scoringRule);

  const correctOutcome = getMatchOutcome(predicted) === getMatchOutcome(actual);
  const correctGoalDifference = getGoalDifference(predicted) === getGoalDifference(actual);
  const exactScore = predicted.home === actual.home && predicted.away === actual.away;

  const outcomePointsAwarded = correctOutcome ? rule.outcomePoints : 0;
  const goalDifferencePointsAwarded = correctGoalDifference ? rule.goalDifferencePoints : 0;
  const exactScorePointsAwarded = exactScore ? rule.exactScorePoints : 0;
  const points = outcomePointsAwarded + goalDifferencePointsAwarded + exactScorePointsAwarded;

  return {
    stage,
    points,
    correctOutcome,
    correctGoalDifference,
    exactScore,
    outcomePointsAwarded,
    goalDifferencePointsAwarded,
    exactScorePointsAwarded,
  };
}

export function calculateMatchPointsFromMatch(params: {
  prediction: ScoreValue;
  match: Pick<Match, "stage" | "homeScore" | "awayScore">;
  scoringRule?: Pick<ScoringRule, "byStage"> | null;
}): MatchScoreBreakdown {
  const { prediction, match, scoringRule } = params;

  if (match.homeScore == null || match.awayScore == null) {
    return {
      stage: match.stage,
      points: 0,
      correctOutcome: false,
      correctGoalDifference: false,
      exactScore: false,
      outcomePointsAwarded: 0,
      goalDifferencePointsAwarded: 0,
      exactScorePointsAwarded: 0,
    };
  }

  return calculateMatchPoints({
    stage: match.stage,
    predicted: prediction,
    actual: { home: match.homeScore, away: match.awayScore },
    scoringRule,
  });
}

export function scorePredictionObject(params: {
  prediction: MatchPrediction;
  match: Pick<Match, "stage" | "homeScore" | "awayScore">;
  scoringRule?: Pick<ScoringRule, "byStage"> | null;
}): MatchScoreBreakdown {
  return calculateMatchPointsFromMatch({
    prediction: params.prediction.predictedScore,
    match: params.match,
    scoringRule: params.scoringRule,
  });
}

export function calculateTotalMatchPoints(
  matches: Array<{
    stage: Stage;
    predicted: ScoreValue;
    actual: ScoreValue;
  }>,
  scoringRule?: Pick<ScoringRule, "byStage"> | null,
): number {
  return matches.reduce((total, match) => {
    return total + calculateMatchPoints({ ...match, scoringRule }).points;
  }, 0);
}

export function getDarkHorseMultiplier(teamTier: TeamTier): number {
  return DARK_HORSE_MULTIPLIERS[teamTier];
}

export function isDarkHorseEligible(teamTier: TeamTier): boolean {
  return getDarkHorseMultiplier(teamTier) > 0;
}

export function calculateDarkHorsePoints(params: {
  teamTier: TeamTier;
  progress: DarkHorseProgress;
  rule?: Pick<ScoringRule, "darkHorse"> | null;
}): number {
  const { teamTier, progress, rule } = params;

  if (progress === "none") return 0;

  const multiplier = rule?.darkHorse?.multipliers?.[teamTier] ?? DARK_HORSE_MULTIPLIERS[teamTier];
  const basePoints = rule?.darkHorse?.progressPoints?.[progress] ?? DARK_HORSE_PROGRESS_POINTS[progress];

  return basePoints * multiplier;
}

function normalizeBonusValue(value: BonusPrediction["value"]): string {
  if (Array.isArray(value)) {
    return JSON.stringify([...value].map(String).sort());
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

export function scoreBonusPrediction(params: {
  prediction: BonusPrediction;
  actualValue: BonusPrediction["value"];
  scoringRule?: Pick<ScoringRule, "bonusPoints"> | null;
  fallbackPoints?: Partial<Record<BonusPredictionType, number>>;
}): number {
  const { prediction, actualValue, scoringRule, fallbackPoints } = params;
  const pointsTable = scoringRule?.bonusPoints ?? fallbackPoints ?? {};

  if (normalizeBonusValue(prediction.value) !== normalizeBonusValue(actualValue)) {
    return 0;
  }

  return pointsTable[prediction.type] ?? 0;
}

export function calculateLeaderboardMemberTotal(params: {
  memberId: string;
  predictions: Array<{
    matchId: string;
    predicted: ScoreValue;
    actual: ScoreValue;
    stage: Stage;
  }>;
  scoringRule?: Pick<ScoringRule, "byStage"> | null;
}): Omit<LeaderboardMemberTotal, "rank"> {
  const { memberId, predictions, scoringRule } = params;

  const scoredPredictions = predictions.map((prediction) => {
    const breakdown = calculateMatchPoints({
      stage: prediction.stage,
      predicted: prediction.predicted,
      actual: prediction.actual,
      scoringRule,
    });

    return {
      matchId: prediction.matchId,
      stage: prediction.stage,
      points: breakdown.points,
      outcomePoints: breakdown.outcomePointsAwarded,
      goalDifferencePoints: breakdown.goalDifferencePointsAwarded,
      exactScorePoints: breakdown.exactScorePointsAwarded,
    };
  });

  return {
    memberId,
    totalPoints: scoredPredictions.reduce((sum, prediction) => sum + prediction.points, 0),
    outcomePoints: scoredPredictions.reduce((sum, prediction) => sum + prediction.outcomePoints, 0),
    goalDifferencePoints: scoredPredictions.reduce((sum, prediction) => sum + prediction.goalDifferencePoints, 0),
    exactScorePoints: scoredPredictions.reduce((sum, prediction) => sum + prediction.exactScorePoints, 0),
    scoredPredictions: scoredPredictions.length,
    predictions: scoredPredictions,
  };
}

export function calculateLeaderboardTotals(params: {
  memberPredictions: Array<{
    memberId: string;
    matchId: string;
    predicted: ScoreValue;
    actual: ScoreValue;
    stage: Stage;
  }>;
  scoringRule?: Pick<ScoringRule, "byStage"> | null;
}): LeaderboardMemberTotal[] {
  const { memberPredictions, scoringRule } = params;
  const grouped = new Map<
    string,
    Array<{
      matchId: string;
      predicted: ScoreValue;
      actual: ScoreValue;
      stage: Stage;
    }>
  >();

  for (const prediction of memberPredictions) {
    const existing = grouped.get(prediction.memberId) ?? [];
    existing.push({
      matchId: prediction.matchId,
      predicted: prediction.predicted,
      actual: prediction.actual,
      stage: prediction.stage,
    });
    grouped.set(prediction.memberId, existing);
  }

  return Array.from(grouped.entries())
    .map(([memberId, predictions]) => calculateLeaderboardMemberTotal({ memberId, predictions, scoringRule }))
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactScorePoints !== a.exactScorePoints) return b.exactScorePoints - a.exactScorePoints;
      if (b.goalDifferencePoints !== a.goalDifferencePoints) return b.goalDifferencePoints - a.goalDifferencePoints;
      if (b.outcomePoints !== a.outcomePoints) return b.outcomePoints - a.outcomePoints;
      return a.memberId.localeCompare(b.memberId);
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}
