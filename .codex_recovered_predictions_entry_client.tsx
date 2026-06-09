"use client";

import { CalendarDays, Lock, PencilLine, Shield, Sparkles, TimerReset } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ensureLeagueMembershipForUser, getUserDisplayName } from "@/lib/auth";
import { getCountryFlagUrl } from "@/lib/country-flags";
import { deleteLocalPrediction, getLocalPredictions, saveLocalPrediction } from "@/lib/local-predictions";
import { getPredictionLockState } from "@/lib/prediction-locking";
import { supabase } from "@/lib/supabase";
import type { PredictionsPageData } from "@/lib/predictions-page-data";
import type { PhaseDeadline } from "@/lib/types";
import { useAuthUser } from "@/hooks/use-auth-user";

function formatLocalMatchTime(kickoffAt: string) {
  const kickoff = new Date(kickoffAt);

  return {
    date: new Intl.DateTimeFormat("es-MX", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(kickoff),
    time: new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(kickoff),
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function formatLocalMatchDateLabel(kickoffAt: string) {
  return new Intl.DateTimeFormat("es-MX", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(kickoffAt));
}

function formatSectionDateLabel(kickoffAt: string) {
  const label = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(kickoffAt));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isPlaceholderKnockoutLabel(name: string) {
  return /winner match/i.test(name);
}

function extractGroupCode(groupTitle: string) {
  const match = groupTitle.match(/group\s*([A-Z])/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function formatPositionSlot(slotCode: string) {
  const match = slotCode.match(/^([A-Z])([123])$/i);

  if (!match) {
    return slotCode;
  }

  const [, groupCode, position] = match;
  const labels: Record<string, string> = {
    "1": "1er lugar",
    "2": "2do lugar",
    "3": "3er lugar",
  };

  return `${labels[position]} del Grupo ${groupCode.toUpperCase()}`;
}

function formatBestThirdSlot(groupCodes: string[]) {
  return `Mejor tercero (${groupCodes.join("/")})`;
}

function formatPreviewSectionDateLabel(date: string) {
  const label = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

type RoundOf32PreviewSlot =
  | {
      kind: "position";
      slotCode: string;
    }
  | {
      kind: "bestThird";
      allowedGroupCodes: string[];
    };

type RoundOf32PreviewTemplate = {
  matchNumber: number;
  kickoffDate: string;
  venue: string;
  homeSlot: RoundOf32PreviewSlot;
  awaySlot: RoundOf32PreviewSlot;
};

type RoundOf32PreviewMatch = {
  id: string;
  matchNumber: number;
  stageLabel: string;
  kickoffDate: string;
  sectionDateLabel: string;
  dateLabel: string;
  timeLabel: string;
  venue: string;
  home: string;
  away: string;
  note: string;
};

const roundOf32PreviewTemplates: RoundOf32PreviewTemplate[] = [
  { matchNumber: 73, kickoffDate: "2026-06-28", venue: "SoFi Stadium", homeSlot: { kind: "position", slotCode: "A2" }, awaySlot: { kind: "position", slotCode: "B2" } },
  { matchNumber: 74, kickoffDate: "2026-06-29", venue: "Gillette Stadium", homeSlot: { kind: "position", slotCode: "E1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["A", "B", "C", "D", "F"] } },
  { matchNumber: 75, kickoffDate: "2026-06-29", venue: "Estadio BBVA", homeSlot: { kind: "position", slotCode: "F1" }, awaySlot: { kind: "position", slotCode: "C2" } },
  { matchNumber: 76, kickoffDate: "2026-06-29", venue: "NRG Stadium", homeSlot: { kind: "position", slotCode: "C1" }, awaySlot: { kind: "position", slotCode: "F2" } },
  { matchNumber: 77, kickoffDate: "2026-06-30", venue: "MetLife Stadium", homeSlot: { kind: "position", slotCode: "I1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["C", "D", "F", "G", "H"] } },
  { matchNumber: 78, kickoffDate: "2026-06-30", venue: "AT&T Stadium", homeSlot: { kind: "position", slotCode: "E2" }, awaySlot: { kind: "position", slotCode: "I2" } },
  { matchNumber: 79, kickoffDate: "2026-06-30", venue: "Estadio Azteca", homeSlot: { kind: "position", slotCode: "A1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["C", "E", "F", "H", "I"] } },
  { matchNumber: 80, kickoffDate: "2026-07-01", venue: "Mercedes-Benz Stadium", homeSlot: { kind: "position", slotCode: "L1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["E", "H", "I", "J", "K"] } },
  { matchNumber: 81, kickoffDate: "2026-07-01", venue: "Levi's Stadium", homeSlot: { kind: "position", slotCode: "D1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["B", "E", "F", "I", "J"] } },
  { matchNumber: 82, kickoffDate: "2026-07-01", venue: "Lumen Field", homeSlot: { kind: "position", slotCode: "G1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["A", "E", "H", "I", "J"] } },
  { matchNumber: 83, kickoffDate: "2026-07-02", venue: "BMO Field", homeSlot: { kind: "position", slotCode: "K2" }, awaySlot: { kind: "position", slotCode: "L2" } },
  { matchNumber: 84, kickoffDate: "2026-07-02", venue: "SoFi Stadium", homeSlot: { kind: "position", slotCode: "H1" }, awaySlot: { kind: "position", slotCode: "J2" } },
  { matchNumber: 85, kickoffDate: "2026-07-02", venue: "BC Place", homeSlot: { kind: "position", slotCode: "B1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["E", "F", "G", "I", "J"] } },
  { matchNumber: 86, kickoffDate: "2026-07-03", venue: "Hard Rock Stadium", homeSlot: { kind: "position", slotCode: "J1" }, awaySlot: { kind: "position", slotCode: "H2" } },
  { matchNumber: 87, kickoffDate: "2026-07-03", venue: "GEHA Field at Arrowhead Stadium", homeSlot: { kind: "position", slotCode: "K1" }, awaySlot: { kind: "bestThird", allowedGroupCodes: ["D", "E", "I", "J", "L"] } },
  { matchNumber: 88, kickoffDate: "2026-07-03", venue: "AT&T Stadium", homeSlot: { kind: "position", slotCode: "D2" }, awaySlot: { kind: "position", slotCode: "G2" } },
];

type ThemeName = "standard" | "canada" | "usa" | "mexico";

type ScoreDraft = {
  home: string;
  away: string;
};

type ViewMode = "date" | "group";

type PageTab = "predictions" | "roundOf32Preview";

type Toast = {
  id: number;
  message: string;
  type: "success" | "error";
};

type EnrichedMatch = PredictionsPageData["matches"][number] & {
  liveCanEdit: boolean;
  liveCanCreate: boolean;
  liveLockState: "open" | "phase-creation-locked" | "match-locked";
  liveLockReason: string;
};

function assignBestThirdPreviewSlots(
  templates: RoundOf32PreviewTemplate[],
  qualifiedThirds: Array<{ groupCode: string; team: string }>,
) {
  const slots = templates.flatMap((template) => {
    const resolved: Array<{
      key: string;
      allowedGroupCodes: string[];
    }> = [];

    if (template.homeSlot.kind === "bestThird") {
      resolved.push({
        key: `${template.matchNumber}-home`,
        allowedGroupCodes: template.homeSlot.allowedGroupCodes,
      });
    }

    if (template.awaySlot.kind === "bestThird") {
      resolved.push({
        key: `${template.matchNumber}-away`,
        allowedGroupCodes: template.awaySlot.allowedGroupCodes,
      });
    }

    return resolved;
  });

  const orderedSlots = [...slots].sort((left, right) => {
    const leftCount = qualifiedThirds.filter((team) => left.allowedGroupCodes.includes(team.groupCode)).length;
    const rightCount = qualifiedThirds.filter((team) => right.allowedGroupCodes.includes(team.groupCode)).length;

    return leftCount - rightCount || left.key.localeCompare(right.key);
  });

  function search(
    index: number,
    usedGroups: Set<string>,
    currentAssignments: Map<string, { groupCode: string; team: string }>,
  ): Map<string, { groupCode: string; team: string }> {
    if (index >= orderedSlots.length) {
      return new Map(currentAssignments);
    }

    const slot = orderedSlots[index];
    const candidates = qualifiedThirds.filter(
      (team) => !usedGroups.has(team.groupCode) && slot.allowedGroupCodes.includes(team.groupCode),
    );

    let bestResult = new Map(currentAssignments);

    for (const candidate of candidates) {
      usedGroups.add(candidate.groupCode);
      currentAssignments.set(slot.key, candidate);

      const result = search(index + 1, usedGroups, currentAssignments);
      if (result.size > bestResult.size) {
        bestResult = result;
      }
      if (bestResult.size === orderedSlots.length) {
        usedGroups.delete(candidate.groupCode);
        currentAssignments.delete(slot.key);
        return bestResult;
      }

      usedGroups.delete(candidate.groupCode);
      currentAssignments.delete(slot.key);
    }

    const skippedResult = search(index + 1, usedGroups, currentAssignments);
    if (skippedResult.size > bestResult.size) {
      bestResult = skippedResult;
    }

    return bestResult;
  }

  return search(0, new Set<string>(), new Map<string, { groupCode: string; team: string }>());
}

export function PredictionsEntryClient({ data }: { data: PredictionsPageData }) {
  const { user: currentUser } = useAuthUser();
  const currentUserName = getUserDisplayName(currentUser);
  const defaultPredictionIds = useMemo(
    () => Object.fromEntries(Object.keys(data.initialPredictions).map((matchId) => [matchId, true])),
    [data.initialPredictions],
  );
  const [memberId, setMemberId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>(data.initialPredictions);
  const [existingPredictionIds, setExistingPredictionIds] = useState<Record<string, boolean>>(defaultPredictionIds);
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof window === "undefined") {
      return "standard";
    }

    const savedTheme = window.localStorage.getItem("selected-theme") as ThemeName | null;
    return savedTheme ?? "standard";
  });
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [savedMatchIds, setSavedMatchIds] = useState<Record<string, boolean>>(defaultPredictionIds);
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("date");
  const [pageTab, setPageTab] = useState<PageTab>("predictions");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [remoteSyncAvailable, setRemoteSyncAvailable] = useState(Boolean(supabase));
  const [remoteSyncError, setRemoteSyncError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("selected-theme", theme);
  }, [theme]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentUser || !currentUserName) {
      return;
    }

    const user = currentUser;
    const userName = currentUserName;
    let active = true;

    async function loadUserPredictions() {
      const localPredictions = getLocalPredictions(data.leagueId, userName);
      const localDrafts = Object.fromEntries(
        Object.entries(localPredictions).map(([matchId, prediction]) => [
          matchId,
          { home: prediction.home, away: prediction.away },
        ]),
      );
      const localSavedIds = Object.fromEntries(Object.keys(localDrafts).map((matchId) => [matchId, true]));

      if (!supabase) {
        if (!active) return;
        setDrafts({ ...data.initialPredictions, ...localDrafts });
        setExistingPredictionIds({
          ...defaultPredictionIds,
          ...localSavedIds,
        });
        setSavedMatchIds({
          ...defaultPredictionIds,
          ...localSavedIds,
        });
        setRemoteSyncAvailable(false);
        setRemoteSyncError("Supabase is not configured in this environment.");
        return;
      }

      try {
        const membership = await ensureLeagueMembershipForUser(user, userName);
        const { data: remotePredictions, error } = await supabase
          .from("predictions")
          .select("match_id,predicted_home_score,predicted_away_score")
          .eq("league_id", data.leagueId)
          .eq("member_id", membership.memberId);

        if (error) {
          throw error;
        }

        if (!active) return;

        const remoteDrafts = Object.fromEntries(
          (remotePredictions ?? []).map((prediction) => [
            prediction.match_id,
            {
              home:
                prediction.predicted_home_score !== null && prediction.predicted_home_score !== undefined
                  ? String(prediction.predicted_home_score)
                  : "",
              away:
                prediction.predicted_away_score !== null && prediction.predicted_away_score !== undefined
                  ? String(prediction.predicted_away_score)
                  : "",
            },
          ]),
        );
        const remoteSavedIds = Object.fromEntries(
          (remotePredictions ?? []).map((prediction) => [prediction.match_id, true]),
        );

        setMemberId(membership.memberId);
        setRemoteSyncAvailable(true);
        setRemoteSyncError(null);
        setDrafts({
          ...data.initialPredictions,
          ...localDrafts,
          ...remoteDrafts,
        });
        setExistingPredictionIds({
          ...defaultPredictionIds,
          ...localSavedIds,
          ...remoteSavedIds,
        });
        setSavedMatchIds({
          ...defaultPredictionIds,
          ...localSavedIds,
          ...remoteSavedIds,
        });
      } catch (error) {
        console.error("Unable to load remote predictions", error);
        if (!active) return;

        const message = error instanceof Error ? error.message : "Remote prediction sync could not be initialized.";

        setMemberId(null);
        setRemoteSyncAvailable(false);
        setRemoteSyncError(message);
        setDrafts({
          ...data.initialPredictions,
          ...localDrafts,
        });
        setExistingPredictionIds({
          ...defaultPredictionIds,
          ...localSavedIds,
        });
        setSavedMatchIds({
          ...defaultPredictionIds,
          ...localSavedIds,
        });
      }
    }

    void loadUserPredictions();

    return () => {
      active = false;
    };
  }, [currentUser, currentUserName, data.initialPredictions, data.leagueId, defaultPredictionIds]);

  function showToast(message: string, type: Toast["type"]) {
    const toastId = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id: toastId, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== toastId));
    }, 3200);
  }

  const enrichedMatches = useMemo<EnrichedMatch[]>(
    () =>
      data.matches.map((match) => {
        const predictionExists = Boolean(existingPredictionIds[match.id]);
        const phaseDeadline = match.phaseDeadlineAt
          ? ({
              id: `${match.id}-${match.stageKey}`,
              tournamentId: data.leagueId,
              stage: match.stageKey,
              deadlineAt: match.phaseDeadlineAt,
              createdAt: match.phaseDeadlineAt,
              updatedAt: match.phaseDeadlineAt,
            } satisfies PhaseDeadline)
          : null;
        const lockWindow = getPredictionLockState({
          match: {
            id: match.id,
            tournamentId: data.leagueId,
            stage: match.stageKey,
            kickoffAt: match.kickoffAt,
            homeTeamId: "home",
            awayTeamId: "away",
            status:
              match.lockState === "match-locked" && new Date(match.kickoffAt).getTime() > now
                ? "live"
                : "scheduled",
            createdAt: match.kickoffAt,
          },
          phaseDeadline,
          predictionExists,
          now: new Date(now),
        });

        return {
          ...match,
          liveCanCreate: lockWindow.canCreate,
          liveCanEdit: lockWindow.canEdit,
          liveLockState: lockWindow.state,
          liveLockReason: lockWindow.reason,
        };
      }),
    [data.leagueId, data.matches, existingPredictionIds, now],
  );

  const editableMatches = useMemo(
    () =>
      enrichedMatches.filter((match) => {
        if (match.stageKey === "group") {
          return true;
        }

        return !(isPlaceholderKnockoutLabel(match.home) || isPlaceholderKnockoutLabel(match.away));
      }),
    [enrichedMatches],
  );

  const unlockedMatches = useMemo(
    () => editableMatches.filter((match) => match.liveCanCreate || match.liveCanEdit).length,
    [editableMatches],
  );

  const availableStages = useMemo(() => {
    const stages = Array.from(new Set([...editableMatches.map((match) => match.stage), "Dieciseisavos"]));
    return ["all", ...stages];
  }, [editableMatches]);

  const filteredMatches = useMemo(() => {
    return editableMatches.filter((match) => {
      if (selectedStage !== "all" && match.stage !== selectedStage) {
        return false;
      }

      if (showOpenOnly && !match.liveCanCreate && !match.liveCanEdit) {
        return false;
      }

      if (!searchQuery.trim()) {
        return true;
      }

      const query = searchQuery.trim().toLowerCase();
      return (
        match.home.toLowerCase().includes(query) ||
        match.away.toLowerCase().includes(query) ||
        match.venue.toLowerCase().includes(query) ||
        match.stage.toLowerCase().includes(query)
      );
    });
  }, [editableMatches, selectedStage, searchQuery, showOpenOnly]);

  const predictionStats = useMemo(() => {
    const total = editableMatches.length;

    if (!total) {
      return {
        total: 0,
        filled: 0,
        completion: 0,
        remaining: 0,
      };
    }

    const filled = editableMatches.filter((match) => {
      const draft = drafts[match.id];
      return Boolean(draft) && /^\d+$/.test(draft.home) && /^\d+$/.test(draft.away);
    }).length;

    const completion = Math.round((filled / total) * 100);

    return {
      total,
      filled,
      completion,
      remaining: Math.max(0, total - filled),
    };
  }, [drafts, editableMatches]);

  function compareGroupTitles(left: string, right: string) {
    const leftMatch = left.match(/group\s*([A-Z])/i);
    const rightMatch = right.match(/group\s*([A-Z])/i);

    if (leftMatch && rightMatch) {
      return leftMatch[1].localeCompare(rightMatch[1], undefined, { sensitivity: "base" });
    }

    return left.localeCompare(right, undefined, { sensitivity: "base" });
  }

  type GroupTableEntry = {
    team: string;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    matches: number;
  };

  type BestThirdPlacement = GroupTableEntry & {
    group: string;
  };

  function createGroupEntry(team: string): GroupTableEntry {
    return {
      team,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      matches: 0,
    };
  }

  function sortGroupEntries(
    entries: GroupTableEntry[],
    groupMatches: EnrichedMatch[],
    drafts: Record<string, ScoreDraft>,
  ) {
    const baseOrdered = [...entries].sort((a, b) =>
      b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team),
    );

    const getHeadToHeadStats = (tiedTeamNames: string[]) => {
      const tieStats = new Map<string, GroupTableEntry>();

      for (const name of tiedTeamNames) {
        tieStats.set(name, createGroupEntry(name));
      }

      for (const match of groupMatches) {
        const homeTeam = match.home;
        const awayTeam = match.away;

        if (!tieStats.has(homeTeam) || !tieStats.has(awayTeam)) {
          continue;
        }

        const draft = drafts[match.id];
        const homeScore = draft?.home ? Number(draft.home) : NaN;
        const awayScore = draft?.away ? Number(draft.away) : NaN;

        if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
          continue;
        }

        const homeStats = tieStats.get(homeTeam)!;
        const awayStats = tieStats.get(awayTeam)!;

        homeStats.goalsFor += homeScore;
        homeStats.goalsAgainst += awayScore;
        homeStats.goalDifference = homeStats.goalsFor - homeStats.goalsAgainst;
        homeStats.matches += 1;

        awayStats.goalsFor += awayScore;
        awayStats.goalsAgainst += homeScore;
        awayStats.goalDifference = awayStats.goalsFor - awayStats.goalsAgainst;
        awayStats.matches += 1;

        if (homeScore > awayScore) {
          homeStats.points += 3;
        } else if (awayScore > homeScore) {
          awayStats.points += 3;
        } else {
          homeStats.points += 1;
          awayStats.points += 1;
        }
      }

      return tieStats;
    };

    const sortedEntries: GroupTableEntry[] = [];
    let index = 0;

    while (index < baseOrdered.length) {
      const current = baseOrdered[index];
      const tieGroup = [current];
      let nextIndex = index + 1;

      while (
        nextIndex < baseOrdered.length &&
        baseOrdered[nextIndex].points === current.points &&
        baseOrdered[nextIndex].goalDifference === current.goalDifference &&
        baseOrdered[nextIndex].goalsFor === current.goalsFor
      ) {
        tieGroup.push(baseOrdered[nextIndex]);
        nextIndex += 1;
      }

      if (tieGroup.length > 1) {
        const tiedNames = tieGroup.map((entry) => entry.team);
        const tieStats = getHeadToHeadStats(tiedNames);

        tieGroup.sort((a, b) => {
          const aHead = tieStats.get(a.team)!;
          const bHead = tieStats.get(b.team)!;

          return (
            bHead.points - aHead.points ||
            bHead.goalDifference - aHead.goalDifference ||
            bHead.goalsFor - aHead.goalsFor ||
            a.team.localeCompare(b.team)
          );
        });
      }

      sortedEntries.push(...tieGroup);
      index = nextIndex;
    }

    return sortedEntries;
  }

  const predictedGroupStandings = useMemo(() => {
    const groups = new Map<
      string,
      {
        teamMap: Record<string, GroupTableEntry>;
        matches: EnrichedMatch[];
      }
    >();

    for (const match of editableMatches) {
      if (!match.stage.toLowerCase().startsWith("group")) {
        continue;
      }

      const draft = drafts[match.id];
      const homeScore = draft?.home ? Number(draft.home) : NaN;
      const awayScore = draft?.away ? Number(draft.away) : NaN;

      if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
        continue;
      }

      const groupName = match.groupLabel ?? match.stage;
      const group = groups.get(groupName) ?? { teamMap: {}, matches: [] };

      const ensureTeam = (name: string) => {
        if (!group.teamMap[name]) {
          group.teamMap[name] = createGroupEntry(name);
        }
        return group.teamMap[name];
      };

      const homeTeam = ensureTeam(match.home);
      const awayTeam = ensureTeam(match.away);

      homeTeam.goalsFor += homeScore;
      homeTeam.goalsAgainst += awayScore;
      homeTeam.matches += 1;
      homeTeam.goalDifference = homeTeam.goalsFor - homeTeam.goalsAgainst;

      awayTeam.goalsFor += awayScore;
      awayTeam.goalsAgainst += homeScore;
      awayTeam.matches += 1;
      awayTeam.goalDifference = awayTeam.goalsFor - awayTeam.goalsAgainst;

      if (homeScore > awayScore) {
        homeTeam.points += 3;
      } else if (awayScore > homeScore) {
        awayTeam.points += 3;
      } else {
        homeTeam.points += 1;
        awayTeam.points += 1;
      }

      group.matches.push(match);
      groups.set(groupName, group);
    }

    return Array.from(groups.entries())
      .map(([group, { teamMap, matches }]) => {
        const entries = sortGroupEntries(Object.values(teamMap), matches, drafts);

        return {
          group,
          entries,
          qualifiers: entries.slice(0, 2),
          thirdPlace: entries[2] ?? null,
        };
      })
      .sort((a, b) => compareGroupTitles(a.group, b.group));
  }, [drafts, editableMatches]);

  const predictedBestThirdPlacers = useMemo(() => {
    const thirdPlaces = predictedGroupStandings
      .map((groupStanding) =>
        groupStanding.thirdPlace
          ? { ...groupStanding.thirdPlace, group: groupStanding.group }
          : null,
      )
      .filter((entry): entry is BestThirdPlacement => Boolean(entry));

    return thirdPlaces
      .sort((a, b) =>
        b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.group.localeCompare(b.group),
      )
      .slice(0, 8);
  }, [predictedGroupStandings]);

  const roundOf32PreviewMatches = useMemo<RoundOf32PreviewMatch[]>(() => {
    const projectedTeams = new Map<string, string>();

    for (const groupStanding of predictedGroupStandings) {
      const groupCode = extractGroupCode(groupStanding.group);

      if (!groupCode) {
        continue;
      }

      if (groupStanding.qualifiers[0]) {
        projectedTeams.set(`${groupCode}1`, groupStanding.qualifiers[0].team);
      }

      if (groupStanding.qualifiers[1]) {
        projectedTeams.set(`${groupCode}2`, groupStanding.qualifiers[1].team);
      }

      if (groupStanding.thirdPlace) {
        projectedTeams.set(`${groupCode}3`, groupStanding.thirdPlace.team);
      }
    }

    const qualifiedThirds = predictedBestThirdPlacers
      .map((entry) => {
        const groupCode = extractGroupCode(entry.group);

        if (!groupCode) {
          return null;
        }

        return {
          groupCode,
          team: entry.team,
        };
      })
      .filter((entry): entry is { groupCode: string; team: string } => Boolean(entry));

    const assignedThirds = assignBestThirdPreviewSlots(roundOf32PreviewTemplates, qualifiedThirds);

    return roundOf32PreviewTemplates.map((template) => {
      const resolveSlot = (slot: RoundOf32PreviewSlot, side: "home" | "away") => {
        if (slot.kind === "position") {
          return projectedTeams.get(slot.slotCode) ?? formatPositionSlot(slot.slotCode);
        }

        return (
          assignedThirds.get(`${template.matchNumber}-${side}`)?.team ?? formatBestThirdSlot(slot.allowedGroupCodes)
        );
      };

      return {
        id: `round-of-32-preview-${template.matchNumber}`,
        matchNumber: template.matchNumber,
        stageLabel: "Dieciseisavos",
        kickoffDate: template.kickoffDate,
        sectionDateLabel: formatPreviewSectionDateLabel(template.kickoffDate),
        dateLabel: formatPreviewSectionDateLabel(template.kickoffDate),
        timeLabel: "Hora por confirmar",
        venue: template.venue,
        home: resolveSlot(template.homeSlot, "home"),
        away: resolveSlot(template.awaySlot, "away"),
        note: "Cruce proyectado segun tus pronosticos actuales de grupos y mejores terceros.",
      };
    });
  }, [predictedBestThirdPlacers, predictedGroupStandings]);

  const filteredRoundOf32PreviewMatches = useMemo(() => {
    return roundOf32PreviewMatches.filter((match) => {
      if (selectedStage !== "all" && selectedStage !== "Dieciseisavos") {
        return false;
      }

      if (showOpenOnly) {
        return false;
      }

      if (!searchQuery.trim()) {
        return true;
      }

      const query = searchQuery.trim().toLowerCase();
      return (
        match.home.toLowerCase().includes(query) ||
        match.away.toLowerCase().includes(query) ||
        match.venue.toLowerCase().includes(query) ||
        match.stageLabel.toLowerCase().includes(query)
      );
    });
  }, [roundOf32PreviewMatches, searchQuery, selectedStage, showOpenOnly]);

  const groupedMatches = useMemo(() => {
    const groups = new Map<string, { title: string; subtitle: string; matches: EnrichedMatch[] }>();

    for (const match of filteredMatches) {
      const roundLabel = match.roundNumber ? `Jornada ${match.roundNumber}` : match.stage;
      const localDateLabel = formatSectionDateLabel(match.kickoffAt);
      const title = viewMode === "group" ? match.groupLabel ?? match.stage : roundLabel;
      const key = viewMode === "group" ? title : `${roundLabel}-${localDateLabel}`;
      const existing = groups.get(key);

      if (existing) {
        existing.matches.push(match);
        continue;
      }

      groups.set(key, {
        title,
        subtitle: localDateLabel,
        matches: [match],
      });
    }

    const grouped = Array.from(groups.values()).map((group) => {
      const dates = Array.from(
        new Set(group.matches.map((match) => match.kickoffAt).sort()),
      );

      const uniqueDateLabels = Array.from(
        new Set(
          dates.map((kickoffAt) => formatSectionDateLabel(kickoffAt)),
        ),
      );

      const subtitle = uniqueDateLabels.length === 1
        ? uniqueDateLabels[0]
        : `${uniqueDateLabels[0]} - ${uniqueDateLabels[uniqueDateLabels.length - 1]}`;

      return {
        ...group,
        subtitle,
      };
    });

    if (viewMode === "group") {
      return grouped.sort((a, b) => compareGroupTitles(a.title, b.title));
    }

    return grouped;
  }, [filteredMatches, viewMode]);

  const groupedRoundOf32Preview = useMemo(() => {
    if (viewMode === "group") {
      if (filteredRoundOf32PreviewMatches.length === 0) {
        return [];
      }

      const sortedMatches = [...filteredRoundOf32PreviewMatches].sort(
        (a, b) => new Date(a.kickoffDate).getTime() - new Date(b.kickoffDate).getTime(),
      );
      const firstDate = sortedMatches[0]?.sectionDateLabel ?? "";
      const lastDate = sortedMatches[sortedMatches.length - 1]?.sectionDateLabel ?? "";

      return [
        {
          title: "Dieciseisavos",
          subtitle: firstDate === lastDate ? firstDate : `${firstDate} - ${lastDate}`,
          matches: sortedMatches,
        },
      ];
    }

    const groups = new Map<string, { title: string; subtitle: string; matches: RoundOf32PreviewMatch[] }>();

    for (const match of filteredRoundOf32PreviewMatches) {
      const existing = groups.get(match.sectionDateLabel);

      if (existing) {
        existing.matches.push(match);
        continue;
      }

      groups.set(match.sectionDateLabel, {
        title: "Dieciseisavos",
        subtitle: match.sectionDateLabel,
        matches: [match],
      });
    }

    return Array.from(groups.values());
  }, [filteredRoundOf32PreviewMatches, viewMode]);

  function updateDraft(matchId: string, side: "home" | "away", value: string) {
    if (value !== "" && !/^\d+$/.test(value)) return;

    setDrafts((current) => ({
      ...current,
      [matchId]: {
        home: current[matchId]?.home ?? "",
        away: current[matchId]?.away ?? "",
        [side]: value,
      },
    }));
    setSavedMatchIds((current) => ({
      ...current,
      [matchId]: false,
    }));
  }

  async function savePrediction(matchId: string) {
    const match = enrichedMatches.find((item) => item.id === matchId);
    const draft = drafts[matchId];

    if (!match || !draft) {
      showToast("Falta el borrador de este partido.", "error");
      return;
    }

    if (!match.liveCanCreate && !match.liveCanEdit) {
      showToast(match.liveLockReason, "error");
      return;
    }

    if (draft.home === "" || draft.away === "") {
      showToast("Ingresa ambos marcadores antes de guardar.", "error");
      return;
    }

    if (!currentUser) {
      showToast("Inicia sesion antes de guardar pronosticos.", "error");
      return;
    }

    if (!currentUserName) {
      showToast("Tu cuenta todavia no tiene nombre visible, asi que aun no se pueden guardar pronosticos.", "error");
      return;
    }

    setSavingMatchId(matchId);

    try {
      if (!supabase || !remoteSyncAvailable) {
        saveLocalPrediction({
          leagueId: data.leagueId,
          userName: currentUserName,
          matchId,
          home: draft.home,
          away: draft.away,
        });
        setSavedMatchIds((current) => ({
          ...current,
          [matchId]: true,
        }));
        setExistingPredictionIds((current) => ({
          ...current,
          [matchId]: true,
        }));
        showToast(
          remoteSyncError
            ? `Pronostico guardado solo en este dispositivo porque la sincronizacion remota no esta disponible: ${remoteSyncError}`
            : "Pronostico guardado solo en este dispositivo para esta cuenta.",
          "success",
        );
        return;
      }

      let resolvedMemberId = memberId;
      if (!resolvedMemberId) {
        const membership = await ensureLeagueMembershipForUser(currentUser, currentUserName);
        resolvedMemberId = membership.memberId;
        setMemberId(membership.memberId);
      }

      const { error } = await supabase.from("predictions").upsert(
        {
          league_id: data.leagueId,
          member_id: resolvedMemberId,
          match_id: matchId,
          predicted_home_score: Number(draft.home),
          predicted_away_score: Number(draft.away),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "member_id,match_id",
        },
      );

      if (error) {
        console.error("Prediction save failed", {
          matchId,
          leagueId: data.leagueId,
          draft,
          error,
        });
        throw error;
      }

      deleteLocalPrediction({
        leagueId: data.leagueId,
        userName: currentUserName,
        matchId,
      });

      setSavedMatchIds((current) => ({
        ...current,
        [matchId]: true,
      }));
      setExistingPredictionIds((current) => ({
        ...current,
        [matchId]: true,
      }));
      setRemoteSyncAvailable(true);
      showToast("Pronostico guardado correctamente.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el pronostico.";

      if (/network error|failed to fetch|dns|getaddrinfo|resolve/i.test(message)) {
        setRemoteSyncAvailable(false);
      }
      setRemoteSyncError(message);

      saveLocalPrediction({
        leagueId: data.leagueId,
        userName: currentUserName,
        matchId,
        home: draft.home,
        away: draft.away,
      });
      setSavedMatchIds((current) => ({
        ...current,
        [matchId]: true,
      }));
      setExistingPredictionIds((current) => ({
        ...current,
        [matchId]: true,
      }));
      showToast(
        remoteSyncAvailable
          ? `${message} Se guardo solo en este dispositivo hasta que vuelva la sincronizacion.`
          : `Pronostico guardado solo en este dispositivo porque la sincronizacion remota no esta disponible: ${message}`,
        "success",
      );
    } finally {
      setSavingMatchId(null);
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text)" }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: "var(--gradient-primary)" }} />
      <div
        className="absolute inset-x-0 top-[-8rem] h-[34rem] opacity-80 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 15% 25%, color-mix(in srgb, var(--color-accent) 24%, transparent), transparent 34%), radial-gradient(circle at 85% 12%, rgba(255,255,255,0.14), transparent 22%), radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--color-accent-secondary) 14%, transparent), transparent 28%)",
        }}
      />

      <section className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <nav
          className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] px-5 py-4 backdrop-blur-2xl"
          style={{
            border: "1px solid var(--color-border-accent)",
            backgroundColor: "color-mix(in srgb, var(--color-bg-card) 88%, rgba(10, 14, 24, 0.3))",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.28)",
          }}
        >
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] uppercase">Pronósticos</p>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-subtle)" }}>
              {data.leagueName} | {data.tournamentName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full px-4 py-2 text-sm font-medium transition duration-200 hover:-translate-y-0.5"
              style={{
                border: "1px solid var(--color-border-accent)",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                color: "var(--color-text)",
              }}
            >
              Volver al inicio
            </Link>
          </div>
        </nav>

        <header className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div
            className="relative overflow-hidden rounded-[2.4rem] px-6 py-8 sm:px-9 sm:py-10"
            style={{
              border: "1px solid var(--color-border-accent)",
              background:
                "linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 80%, rgba(255,255,255,0.04)) 0%, color-mix(in srgb, var(--color-secondary) 84%, transparent) 100%)",
              boxShadow: "0 36px 90px rgba(0, 0, 0, 0.34)",
            }}
          >
            <div
              className="absolute right-[-8%] top-[-10%] h-56 w-56 rounded-full blur-3xl"
              style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 24%, transparent)" }}
            />

            <div className="relative space-y-7">
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm backdrop-blur"
                style={{
                  border: "1px solid var(--color-border-accent)",
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  color: "var(--color-text-subtle)",
                }}
              >
                <Sparkles className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
                Pronóstico partido a partido
              </div>

              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
                  Ingresa tus pronósticos
                </h1>
                <p className="max-w-2xl text-lg leading-8" style={{ color: "var(--color-text-subtle)" }}>
                  Aquí ves solo los partidos que ya se pueden pronosticar. Los cruces de dieciseisavos con equipos todavía sin definir aparecen en una pestaña separada de vista previa.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                  <SummaryCard icon={<PencilLine className="h-4 w-4" />} label="Partidos visibles" value={String(editableMatches.length)} detail="Partidos disponibles para pronosticar" />
                  <SummaryCard icon={<Shield className="h-4 w-4" />} label="Todavía editables" value={String(unlockedMatches)} detail="Antes del inicio" />
                <SummaryCard
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Pronósticos completos"
                  value={`${predictionStats.filled}/${predictionStats.total}`}
                  detail={
                    predictionStats.remaining > 0
                      ? `Faltan ${predictionStats.remaining}`
                      : "Todo completo"
                  }
                />
              </div>
            </div>
          </div>

          <div
            className="rounded-[2.2rem] p-6 backdrop-blur-2xl"
            style={{
              border: "1px solid var(--color-border-accent)",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              boxShadow: "0 28px 70px rgba(0, 0, 0, 0.28)",
            }}
          >
            <div
              className="rounded-[1.7rem] p-6"
              style={{
                border: "1px solid var(--color-border-accent)",
                backgroundColor: "color-mix(in srgb, var(--color-primary) 78%, transparent)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "var(--color-text-subtle)" }}>
                    Reglas de edición
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Bloqueo al iniciar el partido</h2>
                </div>
                <TimerReset className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
              </div>

              <div className="mt-6 space-y-4 text-sm leading-7" style={{ color: "var(--color-text-subtle)" }}>
                <p>Los pronósticos siguen editables hasta la hora exacta de inicio del partido.</p>
                <p>Cuando empieza el partido, la tarjeta se bloquea automáticamente y ya no se puede editar.</p>
                <p>Los pronósticos se guardan en tu cuenta de la liga. Solo se usa guardado local si la sincronización no está disponible.</p>
              </div>

              <div className="mt-6">
                <ProgressBar value={predictionStats.completion} />
                <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
                  <span>Progreso</span>
                  <span>{predictionStats.completion}%</span>
                </div>
                <p className="mt-2 text-sm" style={{ color: "var(--color-text-subtle)" }}>
                  {predictionStats.remaining > 0
                    ? `Completa ${predictionStats.remaining} pronósticos más para terminar.`
                    : "Tus pronósticos están completos."}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6">

          <div
            className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--color-text-subtle)" }}>
                  Vista
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-subtle)" }}>
                  Separa los pronósticos editables de la vista previa de dieciseisavos.
                </p>
              </div>
              <div className="inline-flex rounded-full border border-white/10 bg-slate-950/70 p-1">
                <button
                  type="button"
                  onClick={() => setPageTab("predictions")}
                  className="rounded-full px-4 py-2 text-sm font-semibold transition duration-200"
                  style={{
                    backgroundColor: pageTab === "predictions" ? "color-mix(in srgb, var(--color-accent) 16%, transparent)" : "transparent",
                    color: "var(--color-text)",
                  }}
                >
                  Pronósticos
                </button>
                <button
                  type="button"
                  onClick={() => setPageTab("roundOf32Preview")}
                  className="rounded-full px-4 py-2 text-sm font-semibold transition duration-200"
                  style={{
                    backgroundColor: pageTab === "roundOf32Preview" ? "color-mix(in srgb, var(--color-accent) 16%, transparent)" : "transparent",
                    color: "var(--color-text)",
                  }}
                >
                  Vista previa de dieciseisavos
                </button>
              </div>
            </div>
          </div>

          <div
            className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--color-text-subtle)" }}>
                  Filtros
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-subtle)" }}>
                  Filtra los partidos por fase, equipo o estado editable.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <label className="block">
                  <span className="sr-only">Fase</span>
                  <select
                    value={selectedStage}
                    onChange={(event) => setSelectedStage(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition duration-200"
                  >
                    {availableStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage === "all" ? "Todas las fases" : stage}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="sr-only">Modo de vista</span>
                  <select
                    value={viewMode}
                    onChange={(event) => setViewMode(event.target.value as ViewMode)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition duration-200"
                  >
                    <option value="date">Fecha / jornada</option>
                    <option value="group">Grupo</option>
                  </select>
                </label>
                <label className="block">
                  <span className="sr-only">Buscar partido</span>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar equipo o estadio"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition duration-200"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={showOpenOnly}
                    onChange={(event) => setShowOpenOnly(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-400"
                  />
                  Solo abiertos
                </label>
              </div>
            </div>
          </div>

          {pageTab === "predictions" ? (
              <>
                  <section className="grid gap-8">
                    {groupedMatches.length === 0 ? (
                      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center text-slate-300">
                        No hay partidos que coincidan con tus filtros. Limpia la búsqueda o elige otra fase.
                      </div>
                    ) : (
                      <>
                        {groupedMatches.map((group) => (
                          <div key={`${group.title}-${group.subtitle}`} className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--color-text-subtle)" }}>
                                  {group.title}
                                </p>
                                <h2 className="text-2xl font-black text-white">{group.subtitle}</h2>
                              </div>
                              <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                                {group.matches.length} partidos
                              </p>
                            </div>

                            <div className="grid gap-5 xl:grid-cols-2">
                              {group.matches.map((match) => {
                                const draft = drafts[match.id] ?? { home: "", away: "" };
                                const isSaving = savingMatchId === match.id;
                                const isSaved = Boolean(savedMatchIds[match.id]);

                                return (
                                  <article
                                    key={match.id}
                                    className="rounded-[2rem] p-5 transition duration-300 hover:-translate-y-1"
                                    style={{
                                      border: "1px solid var(--color-border-accent)",
                                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                                      boxShadow: "0 24px 56px rgba(0, 0, 0, 0.22)",
                                    }}
                                  >
                                    <div className="flex flex-col gap-6">
                                      <div className="space-y-4">
                                        {(() => {
                                          const localKickoff = formatLocalMatchTime(match.kickoffAt);
                                          const stageLabel = match.groupLabel ?? match.stage;
                                          return (
                                            <div className="flex flex-wrap items-center gap-3">
                                              <span
                                                className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                                                style={{
                                                  border: "1px solid var(--color-border-accent)",
                                                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                                                  color: "var(--color-text-subtle)",
                                                }}
                                              >
                                                {stageLabel}
                                              </span>
                                              <span className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                                                {localKickoff.date} - {localKickoff.time}
                                              </span>
                                              <span className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                                                {match.venue?.trim() || "Sede por confirmar"}
                                              </span>
                                            </div>
                                          );
                                        })()}

                                        <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
                                          <TeamPanel name={match.home} align="right" />
                                          <div
                                            className="mx-auto rounded-full px-3 py-1 text-xs font-bold"
                                            style={{
                                              border: "1px solid var(--color-border-accent)",
                                              backgroundColor: "rgba(255, 255, 255, 0.1)",
                                              color: "var(--color-text-subtle)",
                                            }}
                                          >
                                            VS
                                          </div>
                                          <TeamPanel name={match.away} align="left" />
                                        </div>
                                      </div>

                                      <div
                                        className="rounded-[1.6rem] p-4"
                                        style={{
                                          border: "1px solid var(--color-border-accent)",
                                          backgroundColor: "color-mix(in srgb, var(--color-secondary) 74%, transparent)",
                                        }}
                                      >
                                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                          <p className="text-sm font-semibold">Marcador pronosticado</p>
                                          {match.liveLockState !== "open" ? (
                                            <span
                                              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                                              style={{
                                                border:
                                                  match.liveLockState === "match-locked"
                                                    ? "1px solid rgba(248, 113, 113, 0.3)"
                                                    : "1px solid rgba(251, 191, 36, 0.28)",
                                                backgroundColor:
                                                  match.liveLockState === "match-locked"
                                                    ? "rgba(239, 68, 68, 0.14)"
                                                    : "rgba(245, 158, 11, 0.14)",
                                                color:
                                                  match.liveLockState === "match-locked"
                                                    ? "rgb(254, 202, 202)"
                                                    : "rgb(254, 240, 138)",
                                              }}
                                            >
                                              <Lock className="h-3.5 w-3.5" />
                                      {match.liveLockState === "match-locked" ? "Bloqueado" : "Cierre de creación"}
                                            </span>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              {isSaved ? (
                                                <span
                                                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                                                  style={{
                                                    border: "1px solid rgba(74, 222, 128, 0.3)",
                                                    backgroundColor: "rgba(34, 197, 94, 0.16)",
                                                    color: "rgb(220, 252, 231)",
                                                  }}
                                                >
                                                  Guardado
                                                </span>
                                              ) : null}
                                              <span
                                                className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                                                style={{
                                                  border: "1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)",
                                                  backgroundColor: "color-mix(in srgb, var(--color-accent) 16%, transparent)",
                                                  color: "var(--color-text)",
                                                }}
                                              >
                                                Abierto
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                          <ScoreInput
                                            label={`Marcador de ${match.home}`}
                                            value={draft.home}
                                            disabled={(!match.liveCanCreate && !match.liveCanEdit) || isSaving}
                                            onChange={(value) => updateDraft(match.id, "home", value)}
                                          />
                                          <div className="text-center text-sm font-semibold" style={{ color: "var(--color-text-subtle)" }}>
                                            -
                                          </div>
                                          <ScoreInput
                                            label={`Marcador de ${match.away}`}
                                            value={draft.away}
                                            disabled={(!match.liveCanCreate && !match.liveCanEdit) || isSaving}
                                            onChange={(value) => updateDraft(match.id, "away", value)}
                                          />
                                        </div>

                                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                          <p className="text-xs leading-6" style={{ color: "var(--color-text-subtle)" }}>
                                            {match.liveLockReason}
                                          </p>
                                          <button
                                            type="button"
                                            disabled={(!match.liveCanCreate && !match.liveCanEdit) || isSaving}
                                            onClick={() => savePrediction(match.id)}
                                            className="w-full shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                            style={{
                                              border: "1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)",
                                              backgroundColor: "color-mix(in srgb, var(--color-accent) 18%, rgba(255,255,255,0.08))",
                                              color: "var(--color-text)",
                                              boxShadow: "0 14px 30px rgba(0, 0, 0, 0.18)",
                                            }}
                                          >
                                            {isSaving ? "Guardando..." : "Guardar pronóstico"}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </article>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </section>
              </>
            

            
          ) : (
                <section className="grid gap-8">
                  <div
                    className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}
                  >
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--color-text-subtle)" }}>
                        Vista previa
                      </p>
                      <h2 className="text-2xl font-black text-white">Así se verían los dieciseisavos</h2>
                      <p className="text-sm leading-6" style={{ color: "var(--color-text-subtle)" }}>
                        Esta pestaña muestra cómo quedarían los cruces según tus pronósticos actuales de la fase de grupos y de los mejores terceros. Mientras los equipos no estén definidos oficialmente, aquí no se puede pronosticar ni guardar resultados.
                      </p>
                    </div>
                  </div>

                  {groupedRoundOf32Preview.length === 0 ? (
                    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center text-slate-300">
                      {showOpenOnly
                        ? "No hay cruces proyectados abiertos en esta vista previa, porque aquí solo se comparan escenarios."
                        : "Ajusta tus filtros o completa más pronósticos de grupos para ver una simulación de los dieciseisavos."}
                    </div>
                  ) : (
                    groupedRoundOf32Preview.map((group) => (
                      <div key={`${group.title}-${group.subtitle}`} className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--color-text-subtle)" }}>
                              {group.title}
                            </p>
                            <h2 className="text-2xl font-black text-white">{group.subtitle}</h2>
                          </div>
                          <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                            {group.matches.length} partidos
                          </p>
                        </div>

                        <div className="grid gap-5 xl:grid-cols-2">
                          {group.matches.map((match) => {
                            return (
                              <article
                                key={match.id}
                                className="rounded-[2rem] p-5"
                                style={{
                                  border: "1px solid var(--color-border-accent)",
                                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                                  boxShadow: "0 24px 56px rgba(0, 0, 0, 0.22)",
                                }}
                              >
                                <div className="space-y-6">
                                  <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                      <span
                                        className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                                        style={{
                                          border: "1px solid var(--color-border-accent)",
                                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                                          color: "var(--color-text-subtle)",
                                        }}
                                      >
                                        {match.stageLabel}
                                      </span>
                                      <span className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                                        {match.dateLabel} - {match.timeLabel}
                                      </span>
                                      <span className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                                        {match.venue?.trim() || "Sede por confirmar"}
                                      </span>
                                    </div>

                                    <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
                                      <TeamPanel name={match.home} align="right" />
                                      <div
                                        className="mx-auto rounded-full px-3 py-1 text-xs font-bold"
                                        style={{
                                          border: "1px solid var(--color-border-accent)",
                                          backgroundColor: "rgba(255, 255, 255, 0.1)",
                                          color: "var(--color-text-subtle)",
                                        }}
                                      >
                                        VS
                                      </div>
                                      <TeamPanel name={match.away} align="left" />
                                    </div>
                                  </div>

                                  <div
                                    className="rounded-[1.6rem] p-4"
                                    style={{
                                      border: "1px solid var(--color-border-accent)",
                                      backgroundColor: "color-mix(in srgb, var(--color-secondary) 74%, transparent)",
                                    }}
                                  >
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                      <p className="text-sm font-semibold">Cruce proyectado</p>
                                      <span
                                        className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                                        style={{
                                          border: "1px solid rgba(251, 191, 36, 0.28)",
                                          backgroundColor: "rgba(245, 158, 11, 0.14)",
                                          color: "rgb(254, 240, 138)",
                                        }}
                                      >
                                        No editable
                                      </span>
                                    </div>
                                    <p className="text-xs leading-6" style={{ color: "var(--color-text-subtle)" }}>
                                      {match.note}
                                    </p>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </section>
              )}
        </section>

        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-2xl px-4 py-3 text-sm shadow-2xl backdrop-blur-xl"
            style={{
              border:
                toast.type === "success"
                  ? "1px solid rgba(74, 222, 128, 0.28)"
                  : "1px solid rgba(248, 113, 113, 0.28)",
              backgroundColor:
                toast.type === "success"
                  ? "rgba(22, 101, 52, 0.84)"
                  : "rgba(127, 29, 29, 0.84)",
              color: "white",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.28)",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </section>
  </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      className="rounded-[1.5rem] p-4"
      style={{
        border: "1px solid var(--color-border-accent)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.08), color-mix(in srgb, var(--color-bg-card) 94%, transparent))",
        boxShadow: "0 18px 34px rgba(0, 0, 0, 0.16)",
      }}
    >
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-accent) 16%, rgba(255,255,255,0.08))",
          color: "var(--color-text)",
        }}
      >
        {icon}
      </div>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
        {label}
      </p>
      <p className="mt-3 text-sm leading-6" style={{ color: "var(--color-text-subtle)" }}>
        {detail}
      </p>
    </div>
  );
}

function TeamPanel({ name, align }: { name: string; align: "left" | "right" }) {
  const flagUrl = getCountryFlagUrl(name);
  const alignmentClasses = align === "right" ? "justify-end" : "justify-start";

  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className={`flex items-center ${alignmentClasses} gap-2`}>
        {flagUrl ? (
          <img
            src={flagUrl}
            alt={`${name} flag`}
            className="h-6 w-8 rounded-sm object-cover"
            width={32}
            height={24}
          />
        ) : null}
        <p className="text-xl font-black text-white sm:text-2xl">{name}</p>
      </div>
      <p className="mt-1 text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
        Equipo
      </p>
    </div>
  );
}

function ScoreInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl px-4 py-4 text-center text-2xl font-black outline-none transition duration-200"
        style={{
          border: "1px solid var(--color-border-accent)",
          backgroundColor: disabled ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.1)",
          color: disabled ? "var(--color-text-subtle)" : "var(--color-text)",
          boxShadow: disabled ? "none" : "inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
        placeholder="-"
      />
    </label>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          background:
            "linear-gradient(90deg, color-mix(in srgb, var(--color-accent-secondary) 70%, transparent), var(--color-accent), color-mix(in srgb, white 28%, var(--color-accent)))",
          boxShadow: "0 0 20px color-mix(in srgb, var(--color-accent) 35%, transparent)",
        }}
      />
    </div>
  );
}
