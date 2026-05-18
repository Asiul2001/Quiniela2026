import { Match, PhaseDeadline, PredictionLockState, ISODateString } from "./types";

// Parse an ISO date string into a Date, returning null for invalid values.
function parseDate(value?: ISODateString | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Check whether `now` is before the provided phase deadline.
 * Returns `true` when there is no deadline or `now` < `deadlineAt`.
 */
export function isBeforePhaseDeadline(phase?: PhaseDeadline | null, now: Date = new Date()): boolean {
  if (!phase || !phase.deadlineAt) return true;
  const deadline = parseDate(phase.deadlineAt);
  if (!deadline) return true;
  return now < deadline;
}

/**
 * Returns `true` when a match is considered locked for editing because kickoff has passed
 * or the match is already live/completed/cancelled.
 */
export function isMatchLocked(match: Match, now: Date = new Date()): boolean {
  // If explicit status indicates the match is no longer editable
  if (match.status === "live" || match.status === "completed" || match.status === "cancelled") {
    return true;
  }

  // If kickoff time exists and is in the past or exactly now, we lock predictions
  const kickoff = parseDate(match.kickoffAt ?? null);
  if (kickoff && now >= kickoff) return true;

  return false;
}

/**
 * Determine whether predictions for a match can be edited.
 * Rules applied (in order):
 * 1. If the match is locked by kickoff/status -> not editable.
 * 2. If a phase deadline exists and has passed -> not editable.
 * 3. Otherwise editable.
 */
export function canEditPredictionForMatch(args: {
  match: Match;
  phaseDeadline?: PhaseDeadline | null;
  now?: Date;
}): boolean {
  const { match, phaseDeadline = null, now = new Date() } = args;

  if (isMatchLocked(match, now)) return false;
  if (!isBeforePhaseDeadline(phaseDeadline, now)) return false;
  return true;
}

/**
 * Return the prediction lock state for a match/phase combination.
 * - `match-locked` when the match kickoff/status indicates locking.
 * - `phase-creation-locked` when the phase deadline has passed but the match hasn't kicked off.
 * - `open` otherwise.
 */
export function predictionLockState(args: {
  match: Match;
  phaseDeadline?: PhaseDeadline | null;
  now?: Date;
}): PredictionLockState {
  const { match, phaseDeadline = null, now = new Date() } = args;

  if (isMatchLocked(match, now)) return "match-locked";
  if (!isBeforePhaseDeadline(phaseDeadline, now)) return "phase-creation-locked";
  return "open";
}

/**
 * Helper that returns a human-friendly summary about whether a prediction may be created/edited.
 * Useful for UI messaging and guards.
 */
export function predictionEditableSummary(args: {
  match: Match;
  phaseDeadline?: PhaseDeadline | null;
  now?: Date;
}): { editable: boolean; reason?: string; state: PredictionLockState } {
  const { match, phaseDeadline = null, now = new Date() } = args;
  const state = predictionLockState({ match, phaseDeadline, now });
  if (state === "open") return { editable: true, state };
  if (state === "match-locked") return { editable: false, reason: "Match has started or is finished.", state };
  return { editable: false, reason: "Phase deadline passed.", state };
}

export default {
  parseDate,
  isBeforePhaseDeadline,
  isMatchLocked,
  canEditPredictionForMatch,
  predictionLockState,
  predictionEditableSummary,
};
import type { Match, PhaseDeadline, PredictionLockState, Stage } from "@/lib/types";

type PredictionWindowParams = {
  phaseDeadlineAt: string | Date;
  matchKickoffAt: string | Date;
  predictionExists: boolean;
  now?: string | Date;
};

export type PredictionWindow = {
  state: PredictionLockState;
  canCreate: boolean;
  canEdit: boolean;
  reason: string;
};

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function isMatchLocked(matchKickoffAt: string | Date, now: string | Date = new Date()): boolean {
  return toDate(now).getTime() >= toDate(matchKickoffAt).getTime();
}

export function isPhaseCreationLocked(
  phaseDeadlineAt: string | Date,
  now: string | Date = new Date(),
): boolean {
  return toDate(now).getTime() >= toDate(phaseDeadlineAt).getTime();
}

export function getPredictionWindow(params: PredictionWindowParams): PredictionWindow {
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

export function getPhaseDeadlineForStage(
  stage: Stage,
  deadlines: PhaseDeadline[],
): PhaseDeadline | undefined {
  return deadlines.find((deadline) => deadline.stage === stage);
}

