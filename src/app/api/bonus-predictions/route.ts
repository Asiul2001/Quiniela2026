import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await request.json();

  const { leagueId, memberId, tournamentId, type, teamId, value } = body;

  if (!leagueId || !memberId || !tournamentId || !type) {
    return NextResponse.json(
      { error: "Missing required fields", received: body },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("bonus_predictions")
    .upsert(
      {
        league_id: leagueId,
        member_id: memberId,
        tournament_id: tournamentId,
        type,
        payload: value ?? {},
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "league_id,member_id,tournament_id,type",
      },
    )
    .select()
    .single();

  if (error) {
    console.error("BONUS SAVE ERROR", error);
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }

  return NextResponse.json({ prediction: data });

  
}
export async function GET(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);

  const leagueId = searchParams.get("leagueId");
  const memberId = searchParams.get("memberId");
  const tournamentId = searchParams.get("tournamentId");

  if (!leagueId || !memberId || !tournamentId) {
    return NextResponse.json({ predictions: [] });
  }

  const { data, error } = await supabase
    .from("bonus_predictions")
    .select("type,payload")
    .eq("league_id", leagueId)
    .eq("member_id", memberId)
    .eq("tournament_id", tournamentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ predictions: data ?? [] });
}