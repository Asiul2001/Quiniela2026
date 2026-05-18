import {
  ScoreValue,
  Match,
  StageScoringRule,
  ScoringRule,
  MatchPrediction,
  BonusPrediction,
  DarkHorsePick,
  DarkHorseProgress,
  Stage,
} from "./types";

/**
 * Determine outcome of a scoreline.
 * Returns "home", "away" or "draw".
 */
export function outcomeOf(score: ScoreValue): "home" | "away" | "draw" {
  if (score.home > score.away) return "home";
  if (score.home < score.away) return "away";
  return "draw";
}

/**
 * Get effective stage scoring rule: prefer per-stage override, otherwise fall back to default.
 */
export function getStageRule(scoring: ScoringRule | undefined, stage: Stage): StageScoringRule {
  const defaultRule = scoring?.default ?? { outcomePoints: 5, goalDifferencePoints: 3, exactScorePoints: 7 };
  const stageRule = scoring?.byStage?.[stage];
  if (stageRule) return stageRule;
  return {
    stage,
    outcomePoints: defaultRule.outcomePoints,
    goalDifferencePoints: defaultRule.goalDifferencePoints,
    exactScorePoints: defaultRule.exactScorePoints,
  };
}

/**
 * Score a single match prediction.
 * - awards `outcomePoints` if predicted match outcome (win/draw/loss) matches
 * - awards `goalDifferencePoints` if predicted goal difference equals actual
 * - awards `exactScorePoints` for exact scoreline match
 * Returns a breakdown and total.
 */
export function scoreMatchPrediction(
  predicted: ScoreValue,
  actual: Match,
  scoring?: ScoringRule
): { outcomePoints: number; goalDifferencePoints: number; exactScorePoints: number; total: number } {
  // If actual scores are not available, no points.
  if (actual.homeScore == null || actual.awayScore == null) {
    return { outcomePoints: 0, goalDifferencePoints: 0, exactScorePoints: 0, total: 0 };
  }

  const actualScore: ScoreValue = { home: actual.homeScore, away: actual.awayScore };
  const predictedOutcome = outcomeOf(predicted);
  const actualOutcome = outcomeOf(actualScore);

  const rule = getStageRule(scoring, actual.stage);

  const outcomePoints = predictedOutcome === actualOutcome ? rule.outcomePoints : 0;

  const predictedDiff = predicted.home - predicted.away;
  const actualDiff = actualScore.home - actualScore.away;
  const goalDifferencePoints = predictedDiff === actualDiff ? rule.goalDifferencePoints : 0;

  const exactScorePoints = predicted.home === actualScore.home && predicted.away === actualScore.away ? rule.exactScorePoints : 0;

  const total = outcomePoints + goalDifferencePoints + exactScorePoints;
  return { outcomePoints, goalDifferencePoints, exactScorePoints, total };
}

/**
 * Score a dark-horse pick.
 * - `progress` is how far the picked team actually went.
 * - `pick.multiplier` can be used to increase/decrease points.
 * - scoringRule.darkHorseMultipliers may be used by callers if available (not required here).
 */
export function scoreDarkHorsePick(pick: DarkHorsePick, progress: DarkHorseProgress, scoring?: ScoringRule): number {
  // base points for progress levels; small but meaningful defaults
  const base: Record<DarkHorseProgress, number> = {
    none: 0,
    quarter_final: 5,
    semi_final: 12,
    final: 25,
  };

  const multiplier = typeof pick.multiplier === "number" ? pick.multiplier : 1;
  const points = base[progress] ?? 0;
  return Math.round(points * multiplier);
}

/**
 * Compare two values for bonus prediction equality.
 * Accepts primitives, arrays (order-insensitive), and simple objects via JSON.
 */
function bonusEquals(a: any, b: any): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    // compare as sets
    const sa = [...new Set(a)].map(String).sort();
    const sb = [...new Set(b)].map(String).sort();
    return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
  }
  if (typeof a === "object" && typeof b === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return String(a) === String(b);
}

/**
 * Score a tournament bonus prediction.
 * - If the prediction value matches the resolved `actualValue`, award configured bonus points or a sensible default.
 */
export function scoreBonusPrediction(bonus: BonusPrediction, actualValue: any, scoring?: ScoringRule): number {
  const bonusPointsConfig = scoring?.default?.bonusPoints ?? null;
  const configured = bonusPointsConfig ? bonusPointsConfig[bonus.type] ?? null : null;
  const defaultPoints = configured ?? 10; // default fallback

  if (bonusEquals(bonus.value, actualValue)) return defaultPoints;
  return 0;
}

/**
 * Convenience function: full scoring for a match prediction object.
 * Uses `MatchPrediction.predictedScore` shape compatible with `ScoreValue`.
 */
export function scorePredictionObject(pred: MatchPrediction, match: Match, scoring?: ScoringRule) {
  return scoreMatchPrediction(pred.predictedScore, match, scoring);
}
import type {
  DarkHorseProgress,
  ScoreValue,
  Stage,
  StageScoringRule,
  TeamTier,
} from "@/lib/types";

const DEFAULT_STAGE_SCORING_RULES: Record<Stage, StageScoringRule> = {
  group: {
    stage: "group",
    outcomePoints: 2,
    goalDifferencePoints: 1,
    exactScorePoints: 2,
  },
  round_of_16: {
    stage: "round_of_16",
    outcomePoints: 3,
    goalDifferencePoints: 1,
    exactScorePoints: 2,
  },
  quarter_final: {
    stage: "quarter_final",
    outcomePoints: 4,
    goalDifferencePoints: 1,
    exactScorePoints: 2,
  },
  semi_final: {
    stage: "semi_final",
    outcomePoints: 5,
    goalDifferencePoints: 1,
    exactScorePoints: 3,
  },
  final: {
    stage: "final",
    outcomePoints: 6,
    goalDifferencePoints: 1,
    exactScorePoints: 4,
  },
};

const DARK_HORSE_MULTIPLIERS: Record<TeamTier, number> = {
  favorite: 0,
  strong_outsider: 1,
  dark_horse: 2,
  big_surprise: 3,
};

const DARK_HORSE_BASE_POINTS: Record<DarkHorseProgress, number> = {
  quarter_final: 5,
  semi_final: 8,
  final: 12,
};

export type MatchScoreBreakdown = {
  stage: Stage;
  points: number;
  correctOutcome: boolean;
  correctGoalDifference: boolean;
  exactScore: boolean;
};

export function getStageScoringRule(
  stage: Stage,
  overrides?: Partial<Record<Stage, Partial<StageScoringRule>>>,
): StageScoringRule {
  return {
    ...DEFAULT_STAGE_SCORING_RULES[stage],
    ...overrides?.[stage],
    stage,
  };
}

export function getMatchOutcome(score: ScoreValue): "home" | "away" | "draw" {
  if (score.home === score.away) {
    return "draw";
  }

  return score.home > score.away ? "home" : "away";
}

export function getGoalDifference(score: ScoreValue): number {
  return score.home - score.away;
}

export function calculateMatchPoints(params: {
  stage: Stage;
  predicted: ScoreValue;
  actual: ScoreValue;
  overrides?: Partial<Record<Stage, Partial<StageScoringRule>>>;
}): MatchScoreBreakdown {
  const { stage, predicted, actual, overrides } = params;
  const rule = getStageScoringRule(stage, overrides);

  const correctOutcome =
    getMatchOutcome(predicted) === getMatchOutcome(actual);
  const correctGoalDifference =
    getGoalDifference(predicted) === getGoalDifference(actual);
  const exactScore =
    predicted.home === actual.home && predicted.away === actual.away;

  let points = 0;

  if (correctOutcome) {
    points += rule.outcomePoints;
  }

  if (correctGoalDifference) {
    points += rule.goalDifferencePoints;
  }

  if (exactScore) {
    points += rule.exactScorePoints;
  }

  return {
    stage,
    points,
    correctOutcome,
    correctGoalDifference,
    exactScore,
  };
}

export function calculateTotalMatchPoints(
  matches: Array<{
    stage: Stage;
    predicted: ScoreValue;
    actual: ScoreValue;
  }>,
  overrides?: Partial<Record<Stage, Partial<StageScoringRule>>>,
): number {
  return matches.reduce((total, match) => {
    return (
      total +
      calculateMatchPoints({
        ...match,
        overrides,
      }).points
    );
  }, 0);
}

export function getDarkHorseMultiplier(teamTier: TeamTier): number {
  return DARK_HORSE_MULTIPLIERS[teamTier];
}

export function isDarkHorseEligible(teamTier: TeamTier): boolean {
  return getDarkHorseMultiplier(teamTier) > 0;
}

export function calculateDarkHorsePoints(
  teamTier: TeamTier,
  progress: DarkHorseProgress,
): number {
  return DARK_HORSE_BASE_POINTS[progress] * getDarkHorseMultiplier(teamTier);
}

export { DEFAULT_STAGE_SCORING_RULES, DARK_HORSE_BASE_POINTS };

