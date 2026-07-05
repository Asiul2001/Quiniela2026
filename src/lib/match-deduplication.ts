import type { Stage } from "@/lib/types";

type MatchStatus = "scheduled" | "live" | "completed" | "cancelled";

export type DeduplicableMatch = {
  id: string;
  stage: Stage;
  match_number: number | null;
  status?: string | null;
  updated_at?: string | null;
  kickoff_at?: string | null;
  venue?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
};

function getStatusRank(status: string | null | undefined) {
  const normalized = (status ?? "scheduled") as MatchStatus;

  switch (normalized) {
    case "completed":
      return 4;
    case "live":
      return 3;
    case "scheduled":
      return 2;
    case "cancelled":
      return 1;
    default:
      return 0;
  }
}

function getResultRank(match: DeduplicableMatch) {
  let rank = 0;

  if (match.home_score != null && match.away_score != null) {
    rank += 2;
  }

  if (match.home_penalty_score != null && match.away_penalty_score != null) {
    rank += 1;
  }

  return rank;
}

function getTimestampRank(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function chooseCanonicalMatch<T extends DeduplicableMatch>(left: T, right: T) {
  const byResults = getResultRank(right) - getResultRank(left);
  if (byResults !== 0) {
    return byResults > 0 ? right : left;
  }

  const byStatus = getStatusRank(right.status) - getStatusRank(left.status);
  if (byStatus !== 0) {
    return byStatus > 0 ? right : left;
  }

  const byUpdatedAt = getTimestampRank(right.updated_at) - getTimestampRank(left.updated_at);
  if (byUpdatedAt !== 0) {
    return byUpdatedAt > 0 ? right : left;
  }

  const byKickoffAt = getTimestampRank(right.kickoff_at) - getTimestampRank(left.kickoff_at);
  if (byKickoffAt !== 0) {
    return byKickoffAt > 0 ? right : left;
  }

  return left.id.localeCompare(right.id) <= 0 ? left : right;
}

export function getLogicalMatchKey(match: Pick<DeduplicableMatch, "id" | "stage" | "match_number">) {
  if (match.match_number != null) {
    return `${match.stage}:${match.match_number}`;
  }

  return `id:${match.id}`;
}

export function buildLogicalMatchGroups<T extends DeduplicableMatch>(matches: T[]) {
  const groupsByKey = new Map<string, T[]>();

  for (const match of matches) {
    const key = getLogicalMatchKey(match);
    const group = groupsByKey.get(key) ?? [];
    group.push(match);
    groupsByKey.set(key, group);
  }

  const canonicalMatches: T[] = [];
  const canonicalIdByMatchId = new Map<string, string>();
  const groupsByCanonicalId = new Map<string, T[]>();

  for (const group of groupsByKey.values()) {
    const canonical = group.reduce((best, current) => chooseCanonicalMatch(best, current));
    canonicalMatches.push(canonical);
    groupsByCanonicalId.set(canonical.id, group);

    for (const match of group) {
      canonicalIdByMatchId.set(match.id, canonical.id);
    }
  }

  canonicalMatches.sort((left, right) => {
    const leftKickoff = getTimestampRank(left.kickoff_at);
    const rightKickoff = getTimestampRank(right.kickoff_at);
    if (leftKickoff !== rightKickoff) {
      return leftKickoff - rightKickoff;
    }

    const leftMatchNumber = left.match_number ?? Number.MAX_SAFE_INTEGER;
    const rightMatchNumber = right.match_number ?? Number.MAX_SAFE_INTEGER;
    if (leftMatchNumber !== rightMatchNumber) {
      return leftMatchNumber - rightMatchNumber;
    }

    return left.id.localeCompare(right.id);
  });

  return {
    canonicalMatches,
    canonicalIdByMatchId,
    groupsByCanonicalId,
    groupsByKey,
  };
}
