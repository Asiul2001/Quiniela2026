export type ID = string;
export type ISODateString = string;
export type Nullable<T> = T | null;

export const STAGES = [
 "group",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
] as const;

export const LEAGUE_ROLES = ["member", "manager", "owner"] as const;
export const PLATFORM_ROLES = ["platform_admin"] as const;
export const LEAGUE_VISIBILITIES = ["public", "private", "unlisted"] as const;
export const MATCH_STATUSES = ["scheduled", "live", "completed", "cancelled"] as const;
export const TEAM_TIERS = ["favorite", "strong_outsider", "dark_horse", "big_surprise"] as const;
export const BONUS_PREDICTION_TYPES = [
  "champion",
  "finalists",
  "semifinalists",
  "golden_boot",
  "dark_horse",
] as const;
export const SUPPORT_CONTRIBUTION_OPTIONS = [5, 10, 20] as const;

export type Stage = (typeof STAGES)[number];
export type LeagueRole = (typeof LEAGUE_ROLES)[number];
export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export type LeagueVisibility = (typeof LEAGUE_VISIBILITIES)[number];
export type MatchStatus = (typeof MATCH_STATUSES)[number];
export type TeamTier = (typeof TEAM_TIERS)[number];
export type BonusPredictionType = (typeof BONUS_PREDICTION_TYPES)[number];

export type PredictionLockState = "open" | "phase-creation-locked" | "match-locked";
export type DarkHorseProgress =
  | "none"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "final"
  | "champion";
export type SupportIntentStatus = "pending" | "maybe_later" | "dismissed" | "pledged";

export type ScoreValue = {
  home: number;
  away: number;
};

export type MatchOutcome = "home" | "away" | "draw";

export type Paginated<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export interface UserIdentity {
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

export type User = UserIdentity;

export interface SupportPromptSettings {
  suggestedAmount: number;
  predefinedAmounts: readonly number[];
  allowCustomAmount: boolean;
  enabled: boolean;
}

export interface LeagueSettings {
  supportPrompt?: SupportPromptSettings;
  allowPublicJoin?: boolean;
  requirePhaseCompletion?: boolean;
  predictionEditGraceSeconds?: number;
  futureFeatures?: {
    donations?: boolean;
    paidPlans?: boolean;
    moderationBots?: boolean;
  };
}

export interface League {
  id: ID;
  name: string;
  slug: string;
  description?: string | null;
  ownerUserId: ID;
  visibility: LeagueVisibility;
  scoringRuleId?: ID | null;
  activeTournamentId?: ID | null;
  settings: LeagueSettings;
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
  isActive: boolean;
  points?: number;
  invitedBy?: ID | null;
}

export interface Tournament {
  id: ID;
  leagueId?: ID | null;
  name: string;
  slug: string;
  year: number;
  hostLabel?: string | null;
  startAt?: ISODateString | null;
  endAt?: ISODateString | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt?: ISODateString | null;
}

export interface Team {
  id: ID;
  tournamentId: ID;
  name: string;
  shortName?: string | null;
  code?: string | null;
  country?: string | null;
  tier: TeamTier;
  createdAt: ISODateString;
}

export interface Match {
  id: ID;
  tournamentId: ID;
  stage: Stage;
  round?: string | number | null;
  kickoffAt: ISODateString;
  phaseDeadlineId?: ID | null;
  venue?: string | null;
  homeTeamId: ID;
  awayTeamId: ID;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  winnerTeamId?: ID | null;
  extraTime?: boolean;
  penalties?: { home?: number; away?: number } | null;
  createdAt: ISODateString;
  updatedAt?: ISODateString | null;
}

export interface MatchPrediction {
  id: ID;
  leagueId: ID;
  tournamentId: ID;
  matchId: ID;
  userId: ID;
  predictedScore: ScoreValue;
  predictedAt: ISODateString;
  updatedAt?: ISODateString | null;
  pointsAwarded?: number | null;
  submittedBy?: ID | null;
}

export interface BonusPrediction {
  id: ID;
  leagueId: ID;
  tournamentId: ID;
  userId: ID;
  type: BonusPredictionType;
  key?: string | null;
  value: string | number | boolean | Array<string | number> | Record<string, unknown>;
  createdAt: ISODateString;
  updatedAt?: ISODateString | null;
  pointsAwarded?: number | null;
  resolvedAt?: ISODateString | null;
}

export interface StageScoringRule {
  stage: Stage;
  outcomePoints: number;
  goalDifferencePoints: number;
  exactScorePoints: number;
}

export interface DarkHorseRuleSet {
  multipliers: Record<TeamTier, number>;
  progressPoints: Record<Exclude<DarkHorseProgress, "none">, number>;
}

export interface ScoringRule {
  id: ID;
  name: string;
  leagueId?: ID | null;
  byStage: Record<Stage, StageScoringRule>;
  darkHorse: DarkHorseRuleSet;
  bonusPoints?: Partial<Record<BonusPredictionType, number>>;
  createdAt: ISODateString;
  updatedAt?: ISODateString | null;
}

export interface DarkHorsePick {
  id: ID;
  leagueId: ID;
  tournamentId: ID;
  userId: ID;
  teamId: ID;
  pickedAt: ISODateString;
  pointsAwarded?: number | null;
  progress?: DarkHorseProgress;
}

export interface PhaseDeadline {
  id: ID;
  tournamentId: ID;
  stage: Stage;
  deadlineAt: ISODateString;
  label?: string | null;
  createdAt: ISODateString;
  updatedAt?: ISODateString | null;
}

export interface SupportIntent {
  id: ID;
  leagueId: ID;
  userId: ID;
  amount?: number | null;
  currency: string;
  status: SupportIntentStatus;
  note?: string | null;
  createdAt: ISODateString;
  updatedAt?: ISODateString | null;
}
