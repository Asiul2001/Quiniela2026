type LocalPrediction = {
  home: string;
  away: string;
  penaltyWinner?: "home" | "away" | "";
  updatedAt: string;
};

const STORAGE_PREFIX = "quiniela-local-predictions";

function getStorageKey(leagueId: string, userName: string) {
  return `${STORAGE_PREFIX}:${leagueId}:${userName.trim().toLowerCase()}`;
}

export function getLocalPredictions(leagueId: string, userName: string) {
  if (typeof window === "undefined") {
    return {} as Record<string, LocalPrediction>;
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(leagueId, userName));
    return raw ? (JSON.parse(raw) as Record<string, LocalPrediction>) : {};
  } catch {
    return {} as Record<string, LocalPrediction>;
  }
}

export function saveLocalPrediction(params: {
  leagueId: string;
  userName: string;
  matchId: string;
  home: string;
  away: string;
  penaltyWinner?: "home" | "away" | "";
}) {
  if (typeof window === "undefined") {
    return;
  }

  const existing = getLocalPredictions(params.leagueId, params.userName);
  const next = {
    ...existing,
    [params.matchId]: {
      home: params.home,
      away: params.away,
      penaltyWinner: params.penaltyWinner ?? "",
      updatedAt: new Date().toISOString(),
    },
  };

  window.localStorage.setItem(getStorageKey(params.leagueId, params.userName), JSON.stringify(next));
}

export function deleteLocalPrediction(params: {
  leagueId: string;
  userName: string;
  matchId: string;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const existing = getLocalPredictions(params.leagueId, params.userName);
  if (!(params.matchId in existing)) {
    return;
  }

  const next = { ...existing };
  delete next[params.matchId];
  window.localStorage.setItem(getStorageKey(params.leagueId, params.userName), JSON.stringify(next));
}
