import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PRIMARY_LEAGUE_SLUG } from "@/lib/app-config";

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

function getPredictionPoints(prediction: any) {
  if (!prediction?.prediction_scores) {
    return 0;
  }

  if (Array.isArray(prediction.prediction_scores)) {
    return prediction.prediction_scores[0]?.total_points ?? 0;
  }

  return prediction.prediction_scores.total_points ?? 0;
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

    const [{ data: members, error: membersError }, { data: profiles, error: profilesError }, { data: teams, error: teamsError }, { data: matches, error: matchesError }, { data: predictions, error: predictionsError }] =
      await Promise.all([
        admin.from("league_members").select("id,user_id").eq("league_id", league.id),
        admin.from("profiles").select("id,display_name,full_name"),
        admin.from("teams").select("id,name").eq("tournament_id", leagueTournament?.tournament_id),
        admin
          .from("matches")
          .select("id,stage,round_number,home_team_id,away_team_id,kickoff_at,venue,status,home_score,away_score")
          .eq("tournament_id", leagueTournament?.tournament_id)
          .order("kickoff_at", { ascending: true }),
        admin
          .from("predictions")
          .select("id,member_id,match_id,predicted_home_score,predicted_away_score,prediction_scores(total_points)")
          .eq("league_id", league.id),
      ]);

    if (leagueTournamentError || membersError || profilesError || teamsError || matchesError || predictionsError) {
      const errorMessage =
        leagueTournamentError?.message || membersError?.message || profilesError?.message || teamsError?.message || matchesError?.message || predictionsError?.message;
      return NextResponse.json({ error: errorMessage ?? "Unable to load player browser data." }, { status: 500 });
    }

    const teamMap = new Map((teams ?? []).map((team) => [team.id, team.name]));
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name ?? profile.full_name ?? "Player"]));
    const matchMap = new Map((matches ?? []).map((match) => [match.id, match]));
    const predictionsByMember = new Map();

    for (const prediction of predictions ?? []) {
      const match = matchMap.get(prediction.match_id);
      if (!match) {
        continue;
      }

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
        points: getPredictionPoints(prediction),
      };

      const existing = predictionsByMember.get(prediction.member_id) ?? [];
      existing.push(playerPrediction);
      predictionsByMember.set(prediction.member_id, existing);
    }

    const totalMatches = Math.max((matches ?? []).length, 1);
    const playerSummaries = (members ?? [])
      .map((member) => {
        const memberPredictions = predictionsByMember.get(member.id) ?? [];
        const points = memberPredictions.reduce((sum: number, prediction: any) => sum + prediction.points, 0);

        return {
          id: member.id,
          userId: member.user_id,
          name: profileMap.get(member.user_id) ?? "Player",
          points,
          completion: Math.round((memberPredictions.length / totalMatches) * 100),
          predictionsCount: memberPredictions.length,
        };
      })
      .sort((a, b) => b.points - a.points || b.completion - a.completion || a.name.localeCompare(b.name));

    return NextResponse.json({
      leagueId: league.id,
      players: playerSummaries,
      playerPredictions: Object.fromEntries(predictionsByMember),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load player browser data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
