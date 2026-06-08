export const PRIMARY_OWNER_UID = "9e9abc0a-a725-45ed-9fd7-18948be3f819";
export const PRIMARY_OWNER_NAME = "Luisa";
export const PRIMARY_OWNER_ACCESS_CODE = "2569";
export const PRIMARY_LEAGUE_SLUG = "familia-strassburger";
export const PRIMARY_LEAGUE_NAME = "Familia Strassburger";
export const PRIMARY_LEAGUE_DESCRIPTION = "Private family league for Quiniela MVP testing";
export const PRIMARY_TOURNAMENT_ID = "11111111-1111-1111-1111-111111111111";
export const PRIMARY_TOURNAMENT_SLUG = "fifa-world-cup-2026";

export const DEFAULT_STAGE_SCORING_RULES = [
  { stage: "group", outcomePoints: 2, goalDifferencePoints: 1, exactScorePoints: 2 },
  { stage: "round_of_16", outcomePoints: 3, goalDifferencePoints: 1, exactScorePoints: 2 },
  { stage: "quarter_final", outcomePoints: 4, goalDifferencePoints: 1, exactScorePoints: 2 },
  { stage: "semi_final", outcomePoints: 5, goalDifferencePoints: 1, exactScorePoints: 3 },
  { stage: "final", outcomePoints: 6, goalDifferencePoints: 1, exactScorePoints: 4 },
] as const;

export const DEFAULT_PHASE_DEADLINES = [
  { stage: "group", deadlineAt: "2026-06-11T18:45:00Z" },
  { stage: "round_of_16", deadlineAt: "2026-06-28T14:45:00Z" },
  { stage: "quarter_final", deadlineAt: "2026-07-03T14:45:00Z" },
  { stage: "semi_final", deadlineAt: "2026-07-08T18:45:00Z" },
  { stage: "final", deadlineAt: "2026-07-11T14:45:00Z" },
] as const;
