import { PRIMARY_LEAGUE_NAME, PRIMARY_LEAGUE_SLUG, PRIMARY_OWNER_UID } from "@/lib/app-config";
import type { League, LeagueMember, LeagueSettings, ScoringRule, SupportPromptSettings, Tournament } from "@/lib/types";
import {
  DARK_HORSE_MULTIPLIERS,
  DARK_HORSE_PROGRESS_POINTS,
  DEFAULT_STAGE_SCORING_RULES,
} from "@/lib/scoring";

export const SUPPORT_PROMPT_COPY =
  "This project is independently built by Luisa. Support helps cover hosting, databases, domain, email/auth, backups, security, monitoring, development tools, user support, future complaint-processing bots, maintenance, and Luisa's time.";

export const DEFAULT_SUPPORT_PROMPT_SETTINGS: SupportPromptSettings = {
  suggestedAmount: 5,
  predefinedAmounts: [5, 10, 20] as const,
  allowCustomAmount: true,
  enabled: true,
};

export const DEFAULT_LEAGUE_SETTINGS: LeagueSettings = {
  supportPrompt: DEFAULT_SUPPORT_PROMPT_SETTINGS,
  allowPublicJoin: false,
  requirePhaseCompletion: true,
  predictionEditGraceSeconds: 0,
  futureFeatures: {
    donations: true,
    paidPlans: true,
    moderationBots: true,
  },
};

export const DEFAULT_SCORING_RULE_TEMPLATE: Omit<ScoringRule, "id" | "createdAt"> = {
  name: "World Cup default scoring",
  leagueId: null,
  byStage: DEFAULT_STAGE_SCORING_RULES,
  darkHorse: {
    multipliers: DARK_HORSE_MULTIPLIERS,
    progressPoints: DARK_HORSE_PROGRESS_POINTS,
  },
  bonusPoints: {
    champion: 0,
    finalists: 0,
    semifinalists: 0,
    golden_boot: 0,
    dark_horse: 0,
  },
  updatedAt: null,
};

export const FIRST_LEAGUE_BOOTSTRAP: {
  league: Omit<League, "id" | "createdAt">;
  ownerMembership: Omit<LeagueMember, "id" | "joinedAt">;
  tournament: Omit<Tournament, "id" | "createdAt">;
} = {
  league: {
    name: `${PRIMARY_LEAGUE_NAME} Quiniela`,
    slug: `${PRIMARY_LEAGUE_SLUG}-quiniela`,
    description: "Private family football prediction league built to support future multi-league expansion.",
    ownerUserId: PRIMARY_OWNER_UID,
    visibility: "private",
    scoringRuleId: null,
    activeTournamentId: null,
    settings: DEFAULT_LEAGUE_SETTINGS,
    updatedAt: null,
  },
  ownerMembership: {
    leagueId: `${PRIMARY_LEAGUE_SLUG}-quiniela`,
    userId: PRIMARY_OWNER_UID,
    role: "owner",
    displayName: "Luisa",
    isActive: true,
    points: 0,
    invitedBy: null,
  },
  tournament: {
    leagueId: `${PRIMARY_LEAGUE_SLUG}-quiniela`,
    name: "FIFA World Cup 2026",
    slug: "world-cup-2026",
    year: 2026,
    hostLabel: "Canada, USA, Mexico",
    startAt: null,
    endAt: null,
    isActive: true,
    updatedAt: null,
  },
};
