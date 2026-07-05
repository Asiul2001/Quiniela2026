import { NextResponse } from "next/server";
import { PRIMARY_LEAGUE_SLUG, PRIMARY_OWNER_NAME, PRIMARY_OWNER_UID } from "@/lib/app-config";
import { buildLogicalMatchGroups } from "@/lib/match-deduplication";
import { calculateMatchPoints } from "@/lib/scoring";
import { calculateRoundOf32ProjectionBonusesByMember } from "@/lib/server-bonus-scoring";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Stage } from "@/lib/types";

type AdminMatchRow = {
  id: string;
  stage: Stage;
  match_number: number | null;
  kickoff_at: string | null;
  venue: string | null;
  status: string | null;
  updated_at: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  home_penalty_score: number | null;
  away_penalty_score: number | null;
};

type AdminPredictionRow = {
  id?: string;
  member_id: string;
  match_id: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_penalty_winner: string | null;
  updated_at?: string | null;
  prediction_scores?:
    | {
        total_points?: number | null;
        bonus_points?: number | null;
      }
    | Array<{
        total_points?: number | null;
        bonus_points?: number | null;
      }>
    | null;
};

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

async function requirePlatformAdmin(request: Request) {
  const token = readBearerToken(request);

  if (!token) {
    return { error: NextResponse.json({ error: "Missing session token." }, { status: 401 }) };
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);

  if (error || !data.user) {
    return { error: NextResponse.json({ error: "Unable to verify the current session." }, { status: 401 }) };
  }

  const isPrimaryOwner =
    data.user.id === PRIMARY_OWNER_UID ||
    normalizeName(
      typeof data.user.user_metadata?.display_name === "string"
        ? data.user.user_metadata.display_name
        : typeof data.user.user_metadata?.full_name === "string"
          ? data.user.user_metadata.full_name
          : "",
    ) === normalizeName(PRIMARY_OWNER_NAME);

  if (!isPrimaryOwner) {
    return { error: NextResponse.json({ error: "Only Luisa can manage manual predictions." }, { status: 403 }) };
  }

  return { admin, userId: data.user.id };
}

function formatPredictionRow(
  prediction: AdminPredictionRow,
  overrides?: {
    matchId?: string;
    totalPoints?: number | null;
    bonusPoints?: number | null;
  },
) {
  const scoreRow = Array.isArray(prediction.prediction_scores)
    ? prediction.prediction_scores[0]
    : prediction.prediction_scores;

  return {
    id: prediction.id ?? null,
    memberId: prediction.member_id,
    matchId: overrides?.matchId ?? prediction.match_id,
    predictedHomeScore: prediction.predicted_home_score,
    predictedAwayScore: prediction.predicted_away_score,
    predictedPenaltyWinner:
      prediction.predicted_penalty_winner === "home" || prediction.predicted_penalty_winner === "away"
        ? prediction.predicted_penalty_winner
        : null,
    totalPoints:
      overrides && "totalPoints" in overrides ? (overrides.totalPoints ?? null) : (scoreRow?.total_points ?? null),
    bonusPoints:
      overrides && "bonusPoints" in overrides ? (overrides.bonusPoints ?? null) : (scoreRow?.bonus_points ?? null),
  };
}

function getTimestampRank(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function chooseCanonicalPrediction(
  current: AdminPredictionRow,
  candidate: AdminPredictionRow,
  canonicalMatchId: string,
) {
  const currentCanonicalRank = current.match_id === canonicalMatchId ? 1 : 0;
  const candidateCanonicalRank = candidate.match_id === canonicalMatchId ? 1 : 0;

  if (candidateCanonicalRank !== currentCanonicalRank) {
    return candidateCanonicalRank > currentCanonicalRank ? candidate : current;
  }

  const currentUpdatedRank = getTimestampRank(current.updated_at);
  const candidateUpdatedRank = getTimestampRank(candidate.updated_at);
  if (candidateUpdatedRank !== currentUpdatedRank) {
    return candidateUpdatedRank > currentUpdatedRank ? candidate : current;
  }

  return (candidate.id ?? "").localeCompare(current.id ?? "") > 0 ? candidate : current;
}

function calculateLivePredictionScore(params: {
  prediction: AdminPredictionRow;
  match: AdminMatchRow | undefined;
  roundOf32BonusesByMember: Map<
    string,
    {
      totalPoints: number;
      items: Array<{
        matchId: string;
        matchNumber: number;
        points: number;
      }>;
    }
  >;
}) {
  const { prediction, match, roundOf32BonusesByMember } = params;

  if (
    !match ||
    prediction.predicted_home_score == null ||
    prediction.predicted_away_score == null ||
    match.home_score == null ||
    match.away_score == null
  ) {
    return {
      totalPoints: null,
      bonusPoints: null,
    };
  }

  const breakdown = calculateMatchPoints({
    stage: match.stage,
    predicted: {
      home: prediction.predicted_home_score,
      away: prediction.predicted_away_score,
    },
    actual: {
      home: match.home_score,
      away: match.away_score,
    },
  });

  let bonusPoints = 0;

  if (match.stage === "round_of_32") {
    bonusPoints =
      roundOf32BonusesByMember
        .get(prediction.member_id)
        ?.items.find((item) => item.matchId === match.id || item.matchNumber === match.match_number)
        ?.points ?? 0;
  } else if (["round_of_16", "quarter_final", "semi_final"].includes(match.stage)) {
    const actualAdvancingSide = getActualAdvancingSide({
      stage: match.stage,
      homeScore: match.home_score,
      awayScore: match.away_score,
      homePenaltyScore: match.home_penalty_score,
      awayPenaltyScore: match.away_penalty_score,
    });

    const predictedAdvancingSide = getPredictedAdvancingSide({
      stage: match.stage,
      homeScore: prediction.predicted_home_score,
      awayScore: prediction.predicted_away_score,
      predictedPenaltyWinner:
        prediction.predicted_penalty_winner === "home" || prediction.predicted_penalty_winner === "away"
          ? prediction.predicted_penalty_winner
          : null,
    });

    if (actualAdvancingSide && predictedAdvancingSide === actualAdvancingSide) {
      bonusPoints = 1;
    }
  }

  return {
    totalPoints: breakdown.points + bonusPoints,
    bonusPoints,
  };
}

function getActualAdvancingSide(params: {
  stage: Stage;
  homeScore: number;
  awayScore: number;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
}) {
  if (params.homeScore > params.awayScore) {
    return "home" as const;
  }

  if (params.awayScore > params.homeScore) {
    return "away" as const;
  }

  if (params.stage === "group") {
    return null;
  }

  if (params.homePenaltyScore != null && params.awayPenaltyScore != null) {
    if (params.homePenaltyScore > params.awayPenaltyScore) return "home" as const;
    if (params.awayPenaltyScore > params.homePenaltyScore) return "away" as const;
  }

  return null;
}

function getPredictedAdvancingSide(params: {
  stage: Stage;
  homeScore: number;
  awayScore: number;
  predictedPenaltyWinner: "home" | "away" | null;
}) {
  if (params.homeScore > params.awayScore) {
    return "home" as const;
  }

  if (params.awayScore > params.homeScore) {
    return "away" as const;
  }

  if (params.stage === "group") {
    return null;
  }

  return params.predictedPenaltyWinner;
}

export async function GET(request: Request) {
  try {
    const auth = await requirePlatformAdmin(request);
    if ("error" in auth) {
      return auth.error;
    }

    const { data: league, error: leagueError } = await auth.admin
      .from("leagues")
      .select("id,name")
      .eq("slug", PRIMARY_LEAGUE_SLUG)
      .single();

    if (leagueError || !league) {
      return NextResponse.json(
        { error: leagueError?.message ?? "League not found." },
        { status: leagueError ? 500 : 404 },
      );
    }

    const { data: leagueTournament, error: leagueTournamentError } = await auth.admin
      .from("league_tournaments")
      .select("tournament_id")
      .eq("league_id", league.id)
      .limit(1)
      .single();

    if (leagueTournamentError || !leagueTournament) {
      return NextResponse.json(
        { error: leagueTournamentError?.message ?? "League tournament not found." },
        { status: leagueTournamentError ? 500 : 404 },
      );
    }

    const [
      { data: members, error: membersError },
      { data: profiles, error: profilesError },
      { data: matches, error: matchesError },
      { data: teams, error: teamsError },
      { data: predictions, error: predictionsError },
    ] = await Promise.all([
      auth.admin.from("league_members").select("id,user_id").eq("league_id", league.id),
      auth.admin.from("profiles").select("id,display_name,full_name"),
      auth.admin
        .from("matches")
        .select("id,stage,match_number,kickoff_at,venue,home_team_id,away_team_id,status,updated_at,home_score,away_score,home_penalty_score,away_penalty_score")
        .eq("tournament_id", leagueTournament.tournament_id)
        .order("kickoff_at", { ascending: true }),
      auth.admin.from("teams").select("id,name").eq("tournament_id", leagueTournament.tournament_id),
      auth.admin
        .from("predictions")
        .select("id,member_id,match_id,predicted_home_score,predicted_away_score,predicted_penalty_winner,updated_at,prediction_scores(total_points,bonus_points)")
        .eq("league_id", league.id),
    ]);

    const firstError =
      membersError ?? profilesError ?? matchesError ?? teamsError ?? predictionsError;

    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        profile.display_name ?? profile.full_name ?? "Jugador",
      ]),
    );

    const teamMap = new Map((teams ?? []).map((team) => [team.id, team.name]));
    const { canonicalMatches, canonicalIdByMatchId } = buildLogicalMatchGroups(matches ?? []);
    const canonicalMatchMap = new Map(canonicalMatches.map((match) => [match.id, match]));

    const groupMatches = (matches ?? []).filter((match) => match.stage === "group");
    const roundOf32Matches = (matches ?? []).filter((match) => match.stage === "round_of_32");
    const groupMatchIds = new Set(groupMatches.map((match) => match.id));
    const roundOf32BonusesByMember = calculateRoundOf32ProjectionBonusesByMember({
      groupMatches,
      roundOf32Matches,
      groupPredictions: (predictions ?? []).filter((prediction) => groupMatchIds.has(prediction.match_id)),
    });

    const canonicalPredictionsByKey = new Map<string, AdminPredictionRow>();
    for (const prediction of predictions ?? []) {
      const canonicalMatchId = canonicalIdByMatchId.get(prediction.match_id) ?? prediction.match_id;
      const key = `${prediction.member_id}::${canonicalMatchId}`;
      const existing = canonicalPredictionsByKey.get(key);
      if (!existing) {
        canonicalPredictionsByKey.set(key, prediction);
        continue;
      }

      canonicalPredictionsByKey.set(key, chooseCanonicalPrediction(existing, prediction, canonicalMatchId));
    }

    return NextResponse.json({
      league: {
        id: league.id,
        name: league.name,
      },
      players: (members ?? [])
        .map((member) => ({
          memberId: member.id,
          userId: member.user_id,
          name: profileMap.get(member.user_id) ?? "Jugador",
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
      matches: canonicalMatches.map((match) => ({
        id: match.id,
        stage: match.stage,
        matchNumber: match.match_number,
        kickoffAt: match.kickoff_at,
        venue: match.venue ?? "Sede por confirmar",
        status: match.status ?? "scheduled",
        home: teamMap.get(match.home_team_id) ?? "Local",
        away: teamMap.get(match.away_team_id) ?? "Visitante",
        homeScore: match.home_score ?? null,
        awayScore: match.away_score ?? null,
        homePenaltyScore: match.home_penalty_score ?? null,
        awayPenaltyScore: match.away_penalty_score ?? null,
      })),
      predictions: Array.from(canonicalPredictionsByKey.entries()).map(([key, prediction]) => {
        const canonicalMatchId = key.split("::")[1] ?? prediction.match_id;
        const liveScore = calculateLivePredictionScore({
          prediction,
          match: canonicalMatchMap.get(canonicalMatchId),
          roundOf32BonusesByMember,
        });

        return formatPredictionRow(prediction, {
          matchId: canonicalMatchId,
          totalPoints: liveScore.totalPoints,
          bonusPoints: liveScore.bonusPoints,
        });
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load admin predictions." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePlatformAdmin(request);
    if ("error" in auth) {
      return auth.error;
    }

    const body = (await request.json().catch(() => null)) as
      | {
          memberId?: string;
          matchId?: string;
          predictedHomeScore?: number;
          predictedAwayScore?: number;
          predictedPenaltyWinner?: "home" | "away" | null;
        }
      | null;

    if (
      !body?.memberId ||
      !body?.matchId ||
      !Number.isFinite(body.predictedHomeScore) ||
      !Number.isFinite(body.predictedAwayScore)
    ) {
      return NextResponse.json({ error: "Missing or invalid manual prediction payload." }, { status: 400 });
    }

    const predictedHomeScore = Number(body.predictedHomeScore);
    const predictedAwayScore = Number(body.predictedAwayScore);

    const { data: league, error: leagueError } = await auth.admin
      .from("leagues")
      .select("id")
      .eq("slug", PRIMARY_LEAGUE_SLUG)
      .single();

    if (leagueError || !league) {
      return NextResponse.json(
        { error: leagueError?.message ?? "League not found." },
        { status: leagueError ? 500 : 404 },
      );
    }

    const [{ data: member, error: memberError }, { data: match, error: matchError }] = await Promise.all([
      auth.admin
        .from("league_members")
        .select("id")
        .eq("league_id", league.id)
        .eq("id", body.memberId)
        .maybeSingle(),
      auth.admin
        .from("matches")
        .select("id,tournament_id,stage,match_number,home_team_id,away_team_id,home_score,away_score,home_penalty_score,away_penalty_score,status")
        .eq("id", body.matchId)
        .maybeSingle(),
    ]);

    if (memberError || !member) {
      return NextResponse.json(
        { error: memberError?.message ?? "Player membership not found." },
        { status: memberError ? 500 : 404 },
      );
    }

    if (matchError || !match) {
      return NextResponse.json(
        { error: matchError?.message ?? "Match not found." },
        { status: matchError ? 500 : 404 },
      );
    }

    const predictedPenaltyWinner =
      predictedHomeScore === predictedAwayScore &&
      (body.predictedPenaltyWinner === "home" || body.predictedPenaltyWinner === "away")
        ? body.predictedPenaltyWinner
        : null;

    const { data: prediction, error: upsertError } = await auth.admin
      .from("predictions")
      .upsert(
        {
          league_id: league.id,
          member_id: body.memberId,
          match_id: body.matchId,
          predicted_home_score: predictedHomeScore,
          predicted_away_score: predictedAwayScore,
          predicted_penalty_winner: predictedPenaltyWinner,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "member_id,match_id",
        },
      )
      .select("id,member_id,match_id,predicted_home_score,predicted_away_score,predicted_penalty_winner,prediction_scores(total_points,bonus_points)")
      .single();

    if (upsertError || !prediction) {
      return NextResponse.json(
        { error: upsertError?.message ?? "Unable to save manual prediction." },
        { status: 500 },
      );
    }

    if (match.home_score != null && match.away_score != null && prediction.id) {
      const breakdown = calculateMatchPoints({
        stage: match.stage as Stage,
        predicted: {
          home: predictedHomeScore,
          away: predictedAwayScore,
        },
        actual: {
          home: match.home_score,
          away: match.away_score,
        },
      });

      let bonusPoints = 0;

      if ((match.stage as Stage) === "round_of_32") {
        const [{ data: groupMatches, error: groupMatchesError }, { data: roundOf32Matches, error: roundOf32MatchesError }] =
          await Promise.all([
            auth.admin
              .from("matches")
              .select("id,match_number,home_team_id,away_team_id")
              .eq("tournament_id", match.tournament_id)
              .eq("stage", "group")
              .order("match_number", { ascending: true }),
            auth.admin
              .from("matches")
              .select("id,match_number,home_team_id,away_team_id")
              .eq("tournament_id", match.tournament_id)
              .eq("stage", "round_of_32"),
          ]);

        if (groupMatchesError || roundOf32MatchesError) {
          return NextResponse.json(
            {
              error:
                groupMatchesError?.message ??
                roundOf32MatchesError?.message ??
                "Unable to score round of 32 classification bonus.",
            },
            { status: 500 },
          );
        }

        const groupMatchIds = (groupMatches ?? []).map((groupMatch) => groupMatch.id);
        const { data: groupPredictions, error: groupPredictionsError } = groupMatchIds.length
          ? await auth.admin
              .from("predictions")
              .select("member_id,match_id,predicted_home_score,predicted_away_score")
              .eq("league_id", league.id)
              .eq("member_id", body.memberId)
              .in("match_id", groupMatchIds)
          : { data: [], error: null };

        if (groupPredictionsError) {
          return NextResponse.json(
            {
              error: groupPredictionsError.message,
            },
            { status: 500 },
          );
        }

        const roundOf32Bonuses = calculateRoundOf32ProjectionBonusesByMember({
          groupMatches: groupMatches ?? [],
          roundOf32Matches: roundOf32Matches ?? [],
          groupPredictions: groupPredictions ?? [],
        });

        const currentMatchBonus =
          roundOf32Bonuses
            .get(body.memberId)
            ?.items.find((item) => item.matchId === match.id || item.matchNumber === match.match_number)?.points ?? 0;

        bonusPoints += currentMatchBonus;
      }

      if (["round_of_16", "quarter_final", "semi_final"].includes(match.stage)) {
        const actualAdvancingSide = getActualAdvancingSide({
          stage: match.stage as Stage,
          homeScore: match.home_score,
          awayScore: match.away_score,
          homePenaltyScore: match.home_penalty_score,
          awayPenaltyScore: match.away_penalty_score,
        });

        const predictedAdvancingSide = getPredictedAdvancingSide({
          stage: match.stage as Stage,
          homeScore: predictedHomeScore,
          awayScore: predictedAwayScore,
          predictedPenaltyWinner,
        });

        if (actualAdvancingSide && predictedAdvancingSide === actualAdvancingSide) {
          bonusPoints += 1;
        }
      }

      const { error: scoreUpsertError } = await auth.admin
        .from("prediction_scores")
        .upsert(
          {
            prediction_id: prediction.id,
            outcome_points: breakdown.outcomePointsAwarded,
            goal_difference_points: breakdown.goalDifferencePointsAwarded,
            exact_score_points: breakdown.exactScorePointsAwarded,
            bonus_points: bonusPoints,
            total_points: breakdown.points + bonusPoints,
          },
          {
            onConflict: "prediction_id",
          },
        );

      if (scoreUpsertError) {
        return NextResponse.json(
          { error: scoreUpsertError.message },
          { status: 500 },
        );
      }

      const { data: refreshedPrediction, error: refreshedPredictionError } = await auth.admin
        .from("predictions")
        .select("id,member_id,match_id,predicted_home_score,predicted_away_score,predicted_penalty_winner,prediction_scores(total_points,bonus_points)")
        .eq("id", prediction.id)
        .single();

      if (refreshedPredictionError || !refreshedPrediction) {
        return NextResponse.json(
          { error: refreshedPredictionError?.message ?? "Unable to reload saved prediction." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        prediction: formatPredictionRow(refreshedPrediction, {
          matchId: body.matchId,
          totalPoints: breakdown.points + bonusPoints,
          bonusPoints,
        }),
      });
    }

    return NextResponse.json({
      prediction: formatPredictionRow(prediction, {
        matchId: body.matchId,
        totalPoints: null,
        bonusPoints: null,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save manual prediction." },
      { status: 500 },
    );
  }
}
