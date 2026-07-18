export const PRIMARY_OWNER_UID = "9e9abc0a-a725-45ed-9fd7-18948be3f819";
export const PRIMARY_OWNER_NAME = "Luisa";
export const PRIMARY_OWNER_ACCESS_CODE = "2569";
export const PRIMARY_LEAGUE_SLUG = "familia-strassburger";
export const PRIMARY_LEAGUE_NAME = "Familia Strassburger";
export const PRIMARY_LEAGUE_DESCRIPTION = "Private family league for Quiniela MVP testing";
export const PRIMARY_TOURNAMENT_ID = "33333333-3333-3333-3333-333333333333";
export const PRIMARY_TOURNAMENT_SLUG = "fifa-world-cup-2026";

export const DEFAULT_STAGE_SCORING_RULES = [
  { stage: "group", outcomePoints: 1, goalDifferencePoints: 1, exactScorePoints: 3 },
  { stage: "round_of_32", outcomePoints: 1, goalDifferencePoints: 1, exactScorePoints: 3 },
  { stage: "round_of_16", outcomePoints: 1, goalDifferencePoints: 1, exactScorePoints: 3 },
  { stage: "quarter_final", outcomePoints: 1, goalDifferencePoints: 1, exactScorePoints: 3 },
  { stage: "semi_final", outcomePoints: 1, goalDifferencePoints: 1, exactScorePoints: 3 },
  { stage: "third_place", outcomePoints: 1, goalDifferencePoints: 1, exactScorePoints: 3 },
  { stage: "final", outcomePoints: 1, goalDifferencePoints: 1, exactScorePoints: 3 },
] as const;

export const DEFAULT_PHASE_DEADLINES = [
  { stage: "group", deadlineAt: "2026-06-11T18:45:00Z" },
  { stage: "round_of_16", deadlineAt: "2026-06-28T14:45:00Z" },
  { stage: "quarter_final", deadlineAt: "2026-07-03T14:45:00Z" },
  { stage: "semi_final", deadlineAt: "2026-07-08T18:45:00Z" },
  { stage: "final", deadlineAt: "2026-07-11T14:45:00Z" },
] as const;
