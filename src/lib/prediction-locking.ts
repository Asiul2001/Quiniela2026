import type { Match, PhaseDeadline, PredictionLockState, Stage } from "@/lib/types";

export type PredictionWindow = {
  state: PredictionLockState;
  canCreate: boolean;
  canEdit: boolean;
  reason: string;
};

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function isPhaseCreationLocked(
  phaseDeadlineAt: string | Date,
  now: string | Date = new Date(),
): boolean {
  return toDate(now).getTime() >= toDate(phaseDeadlineAt).getTime();
}

export function isMatchLocked(
  matchOrKickoff: Pick<Match, "kickoffAt" | "status"> | string | Date,
  now: string | Date = new Date(),
): boolean {
  if (typeof matchOrKickoff === "string" || matchOrKickoff instanceof Date) {
    return toDate(now).getTime() >= toDate(matchOrKickoff).getTime();
  }

  if (matchOrKickoff.status === "live" || matchOrKickoff.status === "completed" || matchOrKickoff.status === "cancelled") {
    return true;
  }

  return toDate(now).getTime() >= toDate(matchOrKickoff.kickoffAt).getTime();
}

export function getPredictionWindow(params: {
  phaseDeadlineAt: string | Date;
  matchKickoffAt: string | Date;
  predictionExists: boolean;
  now?: string | Date;
}): PredictionWindow {
  const { phaseDeadlineAt, matchKickoffAt, predictionExists, now = new Date() } = params;

  if (isMatchLocked(matchKickoffAt, now)) {
    return {
      state: "match-locked",
      canCreate: false,
      canEdit: false,
      reason: "Match kickoff has passed, so this prediction is fully locked.",
    };
  }

  if (isPhaseCreationLocked(phaseDeadlineAt, now)) {
    return predictionExists
      ? {
          state: "phase-creation-locked",
          canCreate: false,
          canEdit: true,
          reason: "Phase deadline has passed, but existing predictions may still be edited until kickoff.",
        }
      : {
          state: "phase-creation-locked",
          canCreate: false,
          canEdit: false,
          reason: "Phase deadline has passed, so missing predictions can no longer be created.",
        };
  }

  return {
    state: "open",
    canCreate: !predictionExists,
    canEdit: predictionExists,
    reason: "Predictions are open before the phase deadline and before kickoff.",
  };
}

export function getPhaseDeadlineForStage(
  stage: Stage,
  deadlines: PhaseDeadline[],
): PhaseDeadline | undefined {
  return deadlines.find((deadline) => deadline.stage === stage);
}

export function getMissingMatchIdsForPhase(params: {
  stage: Stage;
  matches: Match[];
  predictedMatchIds: Iterable<string>;
}): string[] {
  const predictedIds = new Set(params.predictedMatchIds);

  return params.matches
    .filter((match) => match.stage === params.stage)
    .filter((match) => !predictedIds.has(match.id))
    .map((match) => match.id);
}

export function hasCompletedPhasePredictions(params: {
  stage: Stage;
  matches: Match[];
  predictedMatchIds: Iterable<string>;
}): boolean {
  return getMissingMatchIdsForPhase(params).length === 0;
}

export function getPredictionLockState(params: {
  match: Match;
  phaseDeadline?: PhaseDeadline | null;
  predictionExists: boolean;
  now?: string | Date;
}): PredictionWindow {
  const { match, phaseDeadline, predictionExists, now = new Date() } = params;

  if (!phaseDeadline) {
    if (isMatchLocked(match, now)) {
      return {
        state: "match-locked",
        canCreate: false,
        canEdit: false,
        reason: "Match kickoff has passed, so this prediction is fully locked.",
      };
    }

    return {
      state: "open",
      canCreate: !predictionExists,
      canEdit: predictionExists,
      reason: "Predictions are open until kickoff because no phase deadline is configured.",
    };
  }

  return getPredictionWindow({
    phaseDeadlineAt: phaseDeadline.deadlineAt,
    matchKickoffAt: match.kickoffAt,
    predictionExists,
    now,
  });
}
