import type { User } from "@supabase/supabase-js";
import {
  DEFAULT_PHASE_DEADLINES,
  DEFAULT_STAGE_SCORING_RULES,
  PRIMARY_LEAGUE_DESCRIPTION,
  PRIMARY_LEAGUE_NAME,
  PRIMARY_OWNER_ACCESS_CODE,
  PRIMARY_OWNER_NAME,
  PRIMARY_LEAGUE_SLUG,
  PRIMARY_TOURNAMENT_ID,
  PRIMARY_TOURNAMENT_SLUG,
} from "@/lib/app-config";
import {
  buildLoginEmail,
  buildSupabasePasswordFromAccessCode,
  isValidAccessCode,
  normalizeAccessCode,
} from "@/lib/access-codes";
import { supabase, supabaseProjectUrl } from "@/lib/supabase";

type LeagueMembership = {
  leagueId: string;
  memberId: string;
};

type LeagueRecord = {
  id: string;
  owner_user_id: string;
};

function normalizeAuthError(error: unknown): Error {
  if (error instanceof Error) {
    if (/email rate limit exceeded/i.test(error.message)) {
      return new Error(
        "Account creation is blocked by the current Supabase Auth settings. This project is still using the email signup flow, and Supabase is rate-limiting it. To support your 4-character family code system properly, email confirmation needs to be disabled for this project or account creation must be moved to a server-side admin route.",
      );
    }

    if (/failed to fetch|fetch failed|network error|dns|getaddrinfo|resolve/i.test(error.message)) {
      const target = supabaseProjectUrl || "your Supabase project";
      return new Error(
        `The app cannot reach ${target}. Check NEXT_PUBLIC_SUPABASE_URL and confirm that the Supabase project still exists and is reachable.`,
      );
    }

    return error;
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage =
      "message" in error && typeof error.message === "string" ? error.message : null;
    const maybeDetails =
      "details" in error && typeof error.details === "string" ? error.details : null;
    const maybeHint =
      "hint" in error && typeof error.hint === "string" ? error.hint : null;

    if (maybeMessage) {
      const pieces = [maybeMessage, maybeDetails, maybeHint].filter(Boolean);
      return new Error(pieces.join(" | "));
    }
  }

  return new Error("Unable to contact Supabase.");
}

export function getUserDisplayName(user: User | null) {
  if (!user) return null;

  const fromMetadata =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null;

  if (fromMetadata && fromMetadata.trim()) {
    return fromMetadata.trim();
  }

  if (user.email) {
    return user.email.split("@")[0] ?? user.email;
  }

  return "Player";
}

export async function signInWithNamePassword(name: string, password: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const normalizedCode = normalizeAccessCode(password);

  if (!isValidAccessCode(normalizedCode)) {
    throw new Error("Use a 4-character access code with only capital letters and numbers.");
  }

  const email = buildLoginEmail(name);
  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: buildSupabasePasswordFromAccessCode(normalizedCode),
  });

  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      const isPrimaryOwner =
        name.trim().toLowerCase() === PRIMARY_OWNER_NAME.toLowerCase() &&
        normalizedCode === PRIMARY_OWNER_ACCESS_CODE;

      if (isPrimaryOwner) {
        const bootstrapResponse = await fetch("/api/auth/bootstrap-owner", {
          method: "POST",
        });

        if (bootstrapResponse.ok) {
          const retry = await supabase.auth.signInWithPassword({
            email,
            password: buildSupabasePasswordFromAccessCode(normalizedCode),
          });

          data = retry.data;
          error = retry.error;
        } else {
          const payload = (await bootstrapResponse.json().catch(() => null)) as { error?: string } | null;
          throw new Error(
            payload?.error ?? "The Luisa admin account could not be bootstrapped automatically.",
          );
        }
      }

      if (error) {
        throw new Error(
          "That name and access code combination was not recognized. Either this account has not been created in the current Supabase project yet, or the code is incorrect.",
        );
      }
    }
  }

  if (error) {
    throw normalizeAuthError(error);
  }

  if (!data.user) {
    throw new Error("Unable to sign in.");
  }

  try {
    await ensureLeagueMembershipForUser(data.user, name);
  } catch (error) {
    throw normalizeAuthError(error);
  }
  return data.user;
}

export async function signUpWithNamePassword(name: string) {
  const response = await fetch("/api/auth/create-account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { accessCode?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Unable to create account.");
  }

  const accessCode = payload?.accessCode;

  if (!accessCode) {
    throw new Error("The server created the account, but did not return an access code.");
  }

  const user = await signInWithNamePassword(name, accessCode);

  return {
    user,
    accessCode,
  };
}

export async function signOutUser() {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

async function ensurePrimaryLeagueStructure(leagueId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id")
    .or(`id.eq.${PRIMARY_TOURNAMENT_ID},slug.eq.${PRIMARY_TOURNAMENT_SLUG}`)
    .limit(1)
    .maybeSingle();

  if (tournamentError) {
    throw normalizeAuthError(tournamentError);
  }

  if (!tournament) {
    return;
  }

  let leagueTournamentId: string | null = null;

  const { data: existingLeagueTournament, error: existingLeagueTournamentError } = await supabase
    .from("league_tournaments")
    .select("id")
    .eq("league_id", leagueId)
    .eq("tournament_id", tournament.id)
    .maybeSingle();

  if (existingLeagueTournamentError) {
    throw normalizeAuthError(existingLeagueTournamentError);
  }

  if (existingLeagueTournament) {
    leagueTournamentId = existingLeagueTournament.id;
  } else {
    const { data: insertedLeagueTournament, error: insertLeagueTournamentError } = await supabase
      .from("league_tournaments")
      .insert({
        league_id: leagueId,
        tournament_id: tournament.id,
      })
      .select("id")
      .single();

    if (insertLeagueTournamentError || !insertedLeagueTournament) {
      const { data: retriedLeagueTournament, error: retriedLeagueTournamentError } = await supabase
        .from("league_tournaments")
        .select("id")
        .eq("league_id", leagueId)
        .eq("tournament_id", tournament.id)
        .maybeSingle();

      if (retriedLeagueTournamentError || !retriedLeagueTournament) {
        throw normalizeAuthError(
          insertLeagueTournamentError ?? retriedLeagueTournamentError ?? new Error("Unable to create league tournament."),
        );
      }

      leagueTournamentId = retriedLeagueTournament.id;
    } else {
      leagueTournamentId = insertedLeagueTournament.id;
    }
  }

  if (!leagueTournamentId) {
    throw new Error("Unable to resolve the primary league tournament.");
  }

  for (const rule of DEFAULT_STAGE_SCORING_RULES) {
    const { error } = await supabase.from("stage_scoring_rules").upsert(
      {
        league_tournament_id: leagueTournamentId,
        stage: rule.stage,
        outcome_points: rule.outcomePoints,
        goal_difference_points: rule.goalDifferencePoints,
        exact_score_points: rule.exactScorePoints,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "league_tournament_id,stage" },
    );

    if (error) {
      throw normalizeAuthError(error);
    }
  }

  for (const deadline of DEFAULT_PHASE_DEADLINES) {
    const { error } = await supabase.from("phase_deadlines").upsert(
      {
        league_tournament_id: leagueTournamentId,
        stage: deadline.stage,
        deadline_at: deadline.deadlineAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "league_tournament_id,stage" },
    );

    if (error) {
      throw normalizeAuthError(error);
    }
  }
}

async function ensurePrimaryLeagueForUser(user: User): Promise<LeagueRecord> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: existingLeague, error: existingLeagueError } = await supabase
    .from("leagues")
    .select("id,owner_user_id")
    .eq("slug", PRIMARY_LEAGUE_SLUG)
    .maybeSingle<LeagueRecord>();

  if (existingLeagueError) {
    throw normalizeAuthError(existingLeagueError);
  }

  if (existingLeague) {
    if (existingLeague.owner_user_id === user.id) {
      await ensurePrimaryLeagueStructure(existingLeague.id);
    }
    return existingLeague;
  }

  const { data: insertedLeague, error: insertedLeagueError } = await supabase
    .from("leagues")
    .insert({
      name: PRIMARY_LEAGUE_NAME,
      slug: PRIMARY_LEAGUE_SLUG,
      description: PRIMARY_LEAGUE_DESCRIPTION,
      owner_user_id: user.id,
      is_public: false,
      support_prompt_enabled: true,
      suggested_support_amount_cents: 500,
      default_currency: "EUR",
    })
    .select("id,owner_user_id")
    .single<LeagueRecord>();

  if (insertedLeagueError || !insertedLeague) {
    const { data: retriedLeague, error: retriedLeagueError } = await supabase
      .from("leagues")
      .select("id,owner_user_id")
      .eq("slug", PRIMARY_LEAGUE_SLUG)
      .maybeSingle<LeagueRecord>();

    if (retriedLeagueError || !retriedLeague) {
      throw normalizeAuthError(
        insertedLeagueError ?? retriedLeagueError ?? new Error("Unable to create the primary league."),
      );
    }

    if (retriedLeague.owner_user_id === user.id) {
      await ensurePrimaryLeagueStructure(retriedLeague.id);
    }
    return retriedLeague;
  }

  if (insertedLeague.owner_user_id === user.id) {
    await ensurePrimaryLeagueStructure(insertedLeague.id);
  }
  return insertedLeague;
}

export async function ensureLeagueMembershipForUser(user: User, fallbackName?: string): Promise<LeagueMembership> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  if (typeof window !== "undefined") {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;

    if (accessToken) {
      const response = await fetch("/api/auth/bootstrap-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const membership = (await response.json()) as LeagueMembership;
        return membership;
      }

      const responseText = await response.text().catch(() => "");
      let payload: { error?: string } | null = null;

      try {
        payload = JSON.parse(responseText) as { error?: string };
      } catch {
        // ignore invalid JSON and keep raw text for diagnostics
      }

      const message = payload?.error ?? responseText ?? "Unable to bootstrap the current account on the server.";
      throw new Error(`${message} (status: ${response.status} ${response.statusText})`);
    }

    throw new Error("Your session is missing an access token, so account bootstrap could not continue.");
  }

  throw new Error(
    "Account bootstrap should run through the server route in browser sessions. This function was called without a browser session token.",
  );
}
