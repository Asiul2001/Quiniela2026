import { NextResponse } from "next/server";
import { calculateMatchPoints } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";
import type { Stage } from "@/lib/types";

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 },
    );
  }

  const body = await request.json();

  const { matchId, homeScore, awayScore, status } = body;

  if (!matchId || !Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
    return NextResponse.json(
      {
        error: "Missing or invalid score data",
        received: body,
      },
      { status: 400 },
    );
  }

  const { data: updatedMatch, error: matchUpdateError } = await supabase
    .from("matches")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: status ?? "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select("id,stage,home_score,away_score,status")
    .single();

  if (matchUpdateError) {
    console.error("RESULT UPDATE ERROR", matchUpdateError);

    return NextResponse.json(
      { error: matchUpdateError.message },
      { status: 500 },
    );
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select("id,member_id,predicted_home_score,predicted_away_score")
    .eq("match_id", matchId);

  if (predictionsError) {
    console.error("PREDICTIONS FETCH ERROR", predictionsError);

    return NextResponse.json(
      { error: predictionsError.message },
      { status: 500 },
    );
  }

  const scoreRows = (predictions ?? []).map((prediction) => {
    const breakdown = calculateMatchPoints({
      stage: updatedMatch.stage as Stage,
      predicted: {
        home: prediction.predicted_home_score,
        away: prediction.predicted_away_score,
      },
      actual: {
        home: homeScore,
        away: awayScore,
      },
    });

    return {
      prediction_id: prediction.id,
      outcome_points: breakdown.outcomePointsAwarded,
      goal_difference_points: breakdown.goalDifferencePointsAwarded,
      exact_score_points: breakdown.exactScorePointsAwarded,
      total_points: breakdown.points,
    };
  });

  if (scoreRows.length > 0) {
    const { error: scoresError } = await supabase
      .from("prediction_scores")
      .upsert(scoreRows, {
        onConflict: "prediction_id",
      });

    if (scoresError) {
      console.error("PREDICTION SCORES UPSERT ERROR", scoresError);

      return NextResponse.json(
        { error: scoresError.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    match: updatedMatch,
    scoredPredictions: scoreRows.length,
  });
}