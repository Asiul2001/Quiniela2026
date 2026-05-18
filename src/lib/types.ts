// Basic utility types
export type ID = string;
export type ISODateString = string;
export type Nullable<T> = T | null;

export const STAGES = [
  "group",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
] as const;

export const LEAGUE_ROLES = ["member", "manager", "owner"] as const;
export const PLATFORM_ROLES = ["platform_admin"] as const;

export const MATCH_STATUSES = ["scheduled", "live", "completed", "cancelled"] as const;

export const TEAM_TIERS = ["favorite", "strong_outsider", "dark_horse", "big_surprise"] as const;

export const BONUS_PREDICTION_TYPES = [
  "champion",
  "finalists",
  "semifinalists",
  "golden_boot",
  "dark_horse",
] as const;

export type Stage = (typeof STAGES)[number];
export type LeagueRole = (typeof LEAGUE_ROLES)[number];
export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export type MatchStatus = (typeof MATCH_STATUSES)[number];
export type TeamTier = (typeof TEAM_TIERS)[number];
export type BonusPredictionType = (typeof BONUS_PREDICTION_TYPES)[number];

// Pagination
export type Paginated<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

// User
export interface User {
  id: ID;
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  timezone?: string | null;
  platformRole?: PlatformRole | null;
  createdAt: ISODateString;
  updatedAt?: ISODateString | null;
}

// League and membership
export interface League {
  id: ID;
  name: string;
  slug?: string;
  description?: string | null;
  ownerUserId: ID;
  visibility?: "public" | "private" | "unlisted";
  settings?: Record<string, unknown>;
  scoringRuleId?: ID | null;
  createdAt: ISODateString;
  updatedAt?: ISODateString | null;
}

export interface LeagueMember {
  id: ID;
  leagueId: ID;
  userId: ID;
  role: LeagueRole;
  displayName?: string | null;
  joinedAt: ISODateString;
  isActive?: boolean;
  points?: number;
  invitedBy?: ID | null;
}

// Tournament
export interface Tournament {
  id: ID;
  leagueId?: ID | null;
  name: string;
  slug?: string;
  year?: number | null;
  startAt?: ISODateString | null;
  endAt?: ISODateString | null;
  settings?: Record<string, unknown>;
  createdAt?: ISODateString;
}

// Team
export interface Team {
  id: ID;
  tournamentId: ID;
  name: string;
  shortName?: string | null;
  code?: string | null;
  country?: string | null;
  logoUrl?: string | null;
  tier?: TeamTier | null;
  createdAt?: ISODateString;
}

// Match and scoring
export interface ScoreValue {
  home: number;
  away: number;
}

export interface Match {
  id: ID;
  tournamentId: ID;
  stage: Stage;
  round?: string | number | null;
  kickoffAt?: ISODateString | null;
  venue?: string | null;
  homeTeamId: ID;
  awayTeamId: ID;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  winnerTeamId?: ID | null;
  extraTime?: boolean;
  penalties?: { home?: number; away?: number } | null;
  createdAt?: ISODateString;
  updatedAt?: ISODateString | null;
}

// Match predictions
export interface MatchPrediction {
  id: ID;
  matchId: ID;
  userId: ID;
  leagueId?: ID | null;
  predictedAt: ISODateString;
  predictedScore: ScoreValue;
  submittedBy?: ID | null;
  pointsAwarded?: number | null;
  isLocked?: boolean;
  isForfeited?: boolean;
}

// Bonus predictions (champion, golden boot, etc.)
export interface BonusPrediction {
  id: ID;
  tournamentId?: ID | null;
  leagueId?: ID | null;
  userId: ID;
  type: BonusPredictionType;
  key?: string;
  value: string | number | boolean | Array<string | number> | Record<string, unknown>;
  createdAt: ISODateString;
  pointsAwarded?: number | null;
  resolvedAt?: ISODateString | null;
}

// Scoring rules
export interface StageScoringRule {
  stage: Stage;
  outcomePoints: number; // correct result (win/draw/loss)
  goalDifferencePoints: number; // correct goal difference
  exactScorePoints: number; // exact scoreline
}

export interface ScoringRule {
  id: ID;
  name?: string;
  leagueId?: ID | null;
  default: {
    outcomePoints: number;
    goalDifferencePoints: number;
    exactScorePoints: number;
    // optional per-bonus rule points
    bonusPoints?: Record<string, number> | null;
  };
  byStage?: Partial<Record<Stage, StageScoringRule>>;
  darkHorseMultipliers?: Partial<Record<TeamTier, number>>;
  createdAt?: ISODateString;
  updatedAt?: ISODateString | null;
}

// Dark horse picks
export type DarkHorseProgress = "quarter_final" | "semi_final" | "final" | "none";

export interface DarkHorsePick {
  id: ID;
  leagueId: ID;
  userId: ID;
  teamId: ID;
  pickedAt: ISODateString;
  multiplier?: number; // optional points multiplier
  pointsAwarded?: number | null;
  progress?: DarkHorseProgress;
}

// Prediction lock states
export type PredictionLockState = "open" | "phase-creation-locked" | "match-locked";

// Export leftovers for convenience
export { STAGES, LEAGUE_ROLES, PLATFORM_ROLES, MATCH_STATUSES, TEAM_TIERS, BONUS_PREDICTION_TYPES };
