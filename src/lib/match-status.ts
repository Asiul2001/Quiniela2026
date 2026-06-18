import type { MatchStatus } from "@/lib/types";

type MatchStatusInput = {
  status?: string | null;
  kickoffAt?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  now?: number | Date;
};

function normalizeStatusToken(status?: string | null) {
  return (status ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function normalizeMatchStatus(status?: string | null): MatchStatus {
  const token = normalizeStatusToken(status);

  if (["live", "en vivo", "in progress", "in_progress", "ht", "et", "pen"].includes(token)) {
    return "live";
  }

  if (["completed", "finished", "final", "finalizado", "terminado", "ft", "aet", "ft_pen"].includes(token)) {
    return "completed";
  }

  if (["cancelled", "canceled", "cancelado"].includes(token)) {
    return "cancelled";
  }

  return "scheduled";
}

export function getResolvedMatchStatus(params: MatchStatusInput): MatchStatus {
  const normalized = normalizeMatchStatus(params.status);

  if (normalized === "live" || normalized === "completed" || normalized === "cancelled") {
    return normalized;
  }

  const hasScore = params.homeScore !== null && params.homeScore !== undefined && params.awayScore !== null && params.awayScore !== undefined;
  const kickoffTime = params.kickoffAt ? new Date(params.kickoffAt).getTime() : Number.NaN;
  const nowTime =
    params.now instanceof Date
      ? params.now.getTime()
      : typeof params.now === "number"
        ? params.now
        : Date.now();

  if (hasScore && Number.isFinite(kickoffTime) && kickoffTime <= nowTime) {
    return "completed";
  }

  if (Number.isFinite(kickoffTime)) {
    const estimatedEnd = kickoffTime + 2 * 60 * 60 * 1000;
    if (kickoffTime <= nowTime && nowTime < estimatedEnd) {
      return "live";
    }
  }

  return "scheduled";
}

export function isUpcomingMatchStatus(status: MatchStatus) {
  return status === "scheduled" || status === "live";
}
