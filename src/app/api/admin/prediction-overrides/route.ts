import { NextResponse } from "next/server";
import { PRIMARY_LEAGUE_SLUG, PRIMARY_OWNER_NAME, PRIMARY_OWNER_UID } from "@/lib/app-config";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

function formatPredictionRow(prediction: {
  member_id: string;
  match_id: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_penalty_winner: string | null;
}) {
  return {
    memberId: prediction.member_id,
    matchId: prediction.match_id,
    predictedHomeScore: prediction.predicted_home_score,
    predictedAwayScore: prediction.predicted_away_score,
    predictedPenaltyWinner:
      prediction.predicted_penalty_winner === "home" || prediction.predicted_penalty_winner === "away"
        ? prediction.predicted_penalty_winner
        : null,
  };
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
        .select("id,stage,match_number,kickoff_at,venue,home_team_id,away_team_id,status")
        .eq("tournament_id", leagueTournament.tournament_id)
        .order("kickoff_at", { ascending: true }),
      auth.admin.from("teams").select("id,name").eq("tournament_id", leagueTournament.tournament_id),
      auth.admin
        .from("predictions")
        .select("member_id,match_id,predicted_home_score,predicted_away_score,predicted_penalty_winner")
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
      matches: (matches ?? []).map((match) => ({
        id: match.id,
        stage: match.stage,
        matchNumber: match.match_number,
        kickoffAt: match.kickoff_at,
        venue: match.venue ?? "Sede por confirmar",
        status: match.status ?? "scheduled",
        home: teamMap.get(match.home_team_id) ?? "Local",
        away: teamMap.get(match.away_team_id) ?? "Visitante",
      })),
      predictions: (predictions ?? []).map(formatPredictionRow),
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
        .select("id,stage")
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
      body.predictedHomeScore === body.predictedAwayScore &&
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
          predicted_home_score: body.predictedHomeScore,
          predicted_away_score: body.predictedAwayScore,
          predicted_penalty_winner: predictedPenaltyWinner,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "member_id,match_id",
        },
      )
      .select("member_id,match_id,predicted_home_score,predicted_away_score,predicted_penalty_winner")
      .single();

    if (upsertError || !prediction) {
      return NextResponse.json(
        { error: upsertError?.message ?? "Unable to save manual prediction." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      prediction: formatPredictionRow(prediction),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save manual prediction." },
      { status: 500 },
    );
  }
}
