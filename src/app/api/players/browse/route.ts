import { NextResponse } from "next/server";
import { PRIMARY_LEAGUE_SLUG } from "@/lib/app-config";
import {
  calculateDarkHorsePointsByMember,
  calculateRoundOf32ProjectionBonusesByMember,
} from "@/lib/server-bonus-scoring";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type PredictionScoreShape =
  | {
      total_points?: number | null;
      bonus_points?: number | null;
    }
  | Array<{
      total_points?: number | null;
      bonus_points?: number | null;
    }>
  | null;

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

function getPredictionScore(predictionScores: PredictionScoreShape) {
  if (!predictionScores) {
    return { totalPoints: 0, bonusPoints: 0 };
  }

  const row = Array.isArray(predictionScores) ? predictionScores[0] : predictionScores;

  return {
    totalPoints: row?.total_points ?? 0,
    bonusPoints: row?.bonus_points ?? 0,
  };
}

function formatStageLabel(stage: string) {
  const labels: Record<string, string> = {
    group: "Grupos",
    round_of_32: "Dieciseisavos",
    round_of_16: "Octavos",
    quarter_final: "Cuartos",
    semi_final: "Semifinal",
    third_place: "Tercer lugar",
    final: "Final",
  };

  return labels[stage] ?? stage;
}

function formatProgressLabel(progress: string) {
  const labels: Record<string, string> = {
    round_of_32: "llego a dieciseisavos",
    round_of_16: "llego a octavos",
    quarter_final: "llego a cuartos",
    semi_final: "llego a semifinal",
    final: "llego a la final",
    champion: "fue campeon",
  };

  return labels[progress] ?? progress;
}

export async function GET(request: Request) {
  const token = readBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Missing session token." }, { status: 401 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Server-side Supabase admin client is not configured.",
      },
      { status: 500 },
    );
  }

  try {
    const { data: userData, error: authError } = await admin.auth.getUser(token);
    if (authError || !userData.user) {
      const message = authError?.message ?? "Unable to verify the current session.";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    const { data: league, error: leagueError } = await admin
      .from("leagues")
      .select("id")
      .eq("slug", PRIMARY_LEAGUE_SLUG)
      .maybeSingle();

    if (leagueError) {
      return NextResponse.json({ error: leagueError.message }, { status: 500 });
    }

    if (!league?.id) {
      return NextResponse.json({ error: "League not found." }, { status: 404 });
    }

    const { data: leagueTournament, error: leagueTournamentError } = await admin
      .from("league_tournaments")
      .select("tournament_id")
      .eq("league_id", league.id)
      .limit(1)
      .maybeSingle();

    const [
      { data: members, error: membersError },
      { data: profiles, error: profilesError },
      { data: teams, error: teamsError },
      { data: matches, error: matchesError },
      { data: predictions, error: predictionsError },
      { data: darkHorsePredictions, error: darkHorsePredictionsError },
    ] = await Promise.all([
      admin.from("league_members").select("id,user_id").eq("league_id", league.id),
      admin.from("profiles").select("id,display_name,full_name"),
      admin.from("teams").select("id,name,team_tier").eq("tournament_id", leagueTournament?.tournament_id),
      admin
        .from("matches")
        .select("id,stage,round_number,match_number,home_team_id,away_team_id,kickoff_at,venue,status,home_score,away_score,home_penalty_score,away_penalty_score")
        .eq("tournament_id", leagueTournament?.tournament_id)
        .order("kickoff_at", { ascending: true }),
      admin
        .from("predictions")
        .select("id,member_id,match_id,predicted_home_score,predicted_away_score,prediction_scores(total_points,bonus_points)")
        .eq("league_id", league.id),
      admin
        .from("bonus_predictions")
        .select("member_id,payload")
        .eq("league_id", league.id)
        .eq("tournament_id", leagueTournament?.tournament_id)
        .eq("type", "dark_horse"),
    ]);

    if (
      leagueTournamentError ||
      membersError ||
      profilesError ||
      teamsError ||
      matchesError ||
      predictionsError ||
      darkHorsePredictionsError
    ) {
      const errorMessage =
        leagueTournamentError?.message ||
        membersError?.message ||
        profilesError?.message ||
        teamsError?.message ||
        matchesError?.message ||
        predictionsError?.message ||
        darkHorsePredictionsError?.message;
      return NextResponse.json({ error: errorMessage ?? "Unable to load player browser data." }, { status: 500 });
    }

    const teamMap = new Map((teams ?? []).map((team) => [team.id, team.name]));
    const profileMap = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile.display_name ?? profile.full_name ?? "Player"]),
    );
    const matchMap = new Map((matches ?? []).map((match) => [match.id, match]));
    const predictionsByMember = new Map<string, Array<Record<string, unknown>>>();
    const extraPointsByMember = new Map<string, Array<Record<string, unknown>>>();

    const darkHorseBreakdownByMember = calculateDarkHorsePointsByMember({
      teams: teams ?? [],
      matches: matches ?? [],
      darkHorsePredictions: darkHorsePredictions ?? [],
    });
    const roundOf32ProjectionBreakdownByMember = calculateRoundOf32ProjectionBonusesByMember({
      groupMatches: (matches ?? []).filter((match) => match.stage === "group"),
      roundOf32Matches: (matches ?? []).filter((match) => match.stage === "round_of_32"),
      groupPredictions: (predictions ?? [])
        .filter((prediction) => matchMap.get(prediction.match_id)?.stage === "group")
        .map((prediction) => ({
          member_id: prediction.member_id,
          match_id: prediction.match_id,
          predicted_home_score: prediction.predicted_home_score,
          predicted_away_score: prediction.predicted_away_score,
        })),
    });

    for (const prediction of predictions ?? []) {
      const match = matchMap.get(prediction.match_id);
      if (!match) {
        continue;
      }

      const score = getPredictionScore(prediction.prediction_scores as PredictionScoreShape);
      const basePoints = Math.max(0, score.totalPoints - score.bonusPoints);

      const playerPrediction = {
        matchId: match.id,
        home: teamMap.get(match.home_team_id) ?? "Home team",
        away: teamMap.get(match.away_team_id) ?? "Away team",
        predictedHome: prediction.predicted_home_score ?? null,
        predictedAway: prediction.predicted_away_score ?? null,
        actualHome: match.home_score ?? null,
        actualAway: match.away_score ?? null,
        stage: match.stage,
        kickoffAt: match.kickoff_at,
        venue: match.venue ?? "TBD",
        status: match.status ?? "scheduled",
        points: basePoints,
        bonusPoints: score.bonusPoints,
      };

      const existing = predictionsByMember.get(prediction.member_id) ?? [];
      existing.push(playerPrediction);
      predictionsByMember.set(prediction.member_id, existing);

      if (score.bonusPoints > 0 && match.stage !== "round_of_32") {
        const existingExtras = extraPointsByMember.get(prediction.member_id) ?? [];
        existingExtras.push({
          id: `projection-${prediction.id}`,
          label: "Cruce o avance acertado",
          detail: `${formatStageLabel(match.stage)} · ${playerPrediction.home} vs ${playerPrediction.away}`,
          points: score.bonusPoints,
          category: "projection_bonus",
          kickoffAt: match.kickoff_at,
        });
        extraPointsByMember.set(prediction.member_id, existingExtras);
      }
    }

    for (const [memberId, breakdown] of darkHorseBreakdownByMember.entries()) {
      if (breakdown.points <= 0) {
        continue;
      }

      const existingExtras = extraPointsByMember.get(memberId) ?? [];
      existingExtras.push({
        id: `dark-horse-${memberId}`,
        label: "Dark Horse",
        detail: `${breakdown.teamName} · ${formatProgressLabel(breakdown.progress)} · ${breakdown.teamTier}`,
        points: breakdown.points,
        category: "dark_horse",
        kickoffAt: null,
      });
      extraPointsByMember.set(memberId, existingExtras);
    }

    for (const [memberId, breakdown] of roundOf32ProjectionBreakdownByMember.entries()) {
      if (breakdown.totalPoints <= 0) {
        continue;
      }

      const existingExtras = extraPointsByMember.get(memberId) ?? [];

      for (const item of breakdown.items) {
        if (item.points <= 0) {
          continue;
        }

        const match = matchMap.get(item.matchId);
        const homeName = teamMap.get(item.officialHomeTeamId) ?? "Home team";
        const awayName = teamMap.get(item.officialAwayTeamId) ?? "Away team";

        existingExtras.push({
          id: `round-of-32-${memberId}-${item.matchId}`,
          label: "Cruce proyectado",
          detail: `Dieciseisavos · ${homeName} vs ${awayName}`,
          points: item.points,
          category: "projection_bonus",
          kickoffAt: match?.kickoff_at ?? null,
        });
      }

      extraPointsByMember.set(memberId, existingExtras);
    }

    const totalMatches = Math.max((matches ?? []).length, 1);
    const playerSummaries = (members ?? [])
      .map((member) => {
        const memberPredictions = predictionsByMember.get(member.id) ?? [];
        const matchPoints = memberPredictions.reduce(
          (sum, prediction) => sum + (Number((prediction as { points?: number }).points) || 0),
          0,
        );
        const extraPoints = (extraPointsByMember.get(member.id) ?? []).reduce(
          (sum, item) => sum + (Number((item as { points?: number }).points) || 0),
          0,
        );
        const darkHorsePoints = darkHorseBreakdownByMember.get(member.id)?.points ?? 0;
        const projectionPoints = (extraPointsByMember.get(member.id) ?? [])
          .filter((item) => (item as { category?: string }).category === "projection_bonus")
          .reduce((sum, item) => sum + (Number((item as { points?: number }).points) || 0), 0);

        return {
          id: member.id,
          userId: member.user_id,
          name: profileMap.get(member.user_id) ?? "Player",
          points: matchPoints + extraPoints,
          completion: Math.round((memberPredictions.length / totalMatches) * 100),
          predictionsCount: memberPredictions.length,
          breakdown: {
            matchPoints,
            extraPoints,
            darkHorsePoints,
            projectionPoints,
          },
        };
      })
      .sort((a, b) => b.points - a.points || b.completion - a.completion || a.name.localeCompare(b.name));

    return NextResponse.json({
      leagueId: league.id,
      players: playerSummaries,
      playerPredictions: Object.fromEntries(predictionsByMember),
      playerExtraPoints: Object.fromEntries(extraPointsByMember),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load player browser data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
