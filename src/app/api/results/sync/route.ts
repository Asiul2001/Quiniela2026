import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type SportmonksFixture = {
  id: number;
  name?: string;
  starting_at?: string;
  state?: {
    name?: string;
    short_name?: string;
  };
  scores?: Array<{
    participant_id: number;
    score?: {
      goals?: number;
    };
    description?: string;
  }>;
  participants?: Array<{
    id: number;
    name: string;
    meta?: {
      location?: "home" | "away";
    };
  }>;
};

function normalizeTeamName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function getStatus(shortName?: string | null) {
  const status = shortName?.toUpperCase();

  if (["LIVE", "HT", "ET", "PEN"].includes(status ?? "")) return "live";
  if (["FT", "AET", "FT_PEN"].includes(status ?? "")) return "completed";
  if (["NS", "TBA"].includes(status ?? "")) return "scheduled";

  return "scheduled";
}

function getScoreForParticipant(fixture: SportmonksFixture, participantId: number) {
  const scoreRow = fixture.scores?.find(
    (score) =>
      score.participant_id === participantId &&
      (!score.description || score.description === "CURRENT"),
  );

  return scoreRow?.score?.goals ?? null;
}

export async function POST() {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const token = process.env.SPORTMONKS_API_TOKEN;
  const seasonId = process.env.SPORTMONKS_WORLD_CUP_SEASON_ID ?? "26618";

  if (!token) {
    return NextResponse.json({ error: "Missing SPORTMONKS_API_TOKEN" }, { status: 500 });
  }

  const url = new URL("https://api.sportmonks.com/v3/football/fixtures");
  url.searchParams.set("api_token", token);
  url.searchParams.set("filters", `fixtureSeasons:${seasonId}`);
  url.searchParams.set("include", "participants;scores;state");

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "SportMonks request failed", status: response.status },
      { status: 500 },
    );
  }

  const json = await response.json();
  console.log("SPORTMONKS STATUS", response.status);
console.log("SPORTMONKS RAW", JSON.stringify(json).slice(0, 2000));
  const fixtures: SportmonksFixture[] = json.data ?? [];

  const { data: teams } = await supabase
    .from("teams")
    .select("id,name");

  const teamByName = new Map(
    (teams ?? []).map((team) => [normalizeTeamName(team.name), team.id]),
  );

  const { data: dbMatches } = await supabase
    .from("matches")
    .select("id,home_team_id,away_team_id,kickoff_at");

  let updated = 0;
  const skipped: Array<{ fixture: string; reason: string }> = [];

  for (const fixture of fixtures) {
    const home = fixture.participants?.find(
      (participant) => participant.meta?.location === "home",
    );
    const away = fixture.participants?.find(
      (participant) => participant.meta?.location === "away",
    );

    if (!home || !away) {
      skipped.push({ fixture: fixture.name ?? String(fixture.id), reason: "Missing participants" });
      continue;
    }

    const homeTeamId = teamByName.get(normalizeTeamName(home.name));
    const awayTeamId = teamByName.get(normalizeTeamName(away.name));

    if (!homeTeamId || !awayTeamId) {
      skipped.push({
        fixture: fixture.name ?? `${home.name} vs ${away.name}`,
        reason: `Could not match teams: ${home.name} / ${away.name}`,
      });
      continue;
    }

    const match = (dbMatches ?? []).find(
      (candidate) =>
        candidate.home_team_id === homeTeamId &&
        candidate.away_team_id === awayTeamId,
    );

    if (!match) {
      skipped.push({
        fixture: fixture.name ?? `${home.name} vs ${away.name}`,
        reason: "Could not match DB match",
      });
      continue;
    }

    const homeScore = getScoreForParticipant(fixture, home.id);
    const awayScore = getScoreForParticipant(fixture, away.id);

    const { error } = await supabase
      .from("matches")
      .update({
        status: getStatus(fixture.state?.short_name),
        home_score: homeScore,
        away_score: awayScore,
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id);

    if (error) {
      skipped.push({
        fixture: fixture.name ?? `${home.name} vs ${away.name}`,
        reason: error.message,
      });
      continue;
    }

    updated += 1;
  }

  return NextResponse.json({
    updated,
    skipped,
    fixtureCount: fixtures.length,
  });
}