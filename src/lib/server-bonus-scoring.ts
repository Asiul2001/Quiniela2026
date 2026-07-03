import { calculateDarkHorsePoints } from "@/lib/scoring";
import type { Stage, TeamTier } from "@/lib/types";

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
