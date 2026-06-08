import type { SupabaseClient } from "@supabase/supabase-js";
import { buildLoginEmail } from "@/lib/access-codes";
import {
  DEFAULT_PHASE_DEADLINES,
  DEFAULT_STAGE_SCORING_RULES,
  PRIMARY_LEAGUE_DESCRIPTION,
  PRIMARY_LEAGUE_NAME,
  PRIMARY_LEAGUE_SLUG,
  PRIMARY_OWNER_NAME,
  PRIMARY_OWNER_UID,
  PRIMARY_TOURNAMENT_ID,
  PRIMARY_TOURNAMENT_SLUG,
} from "@/lib/app-config";

type AdminClient = SupabaseClient;

export type LeagueMembershipBootstrap = {
  leagueId: string;
  memberId: string;
};

type LeagueRecord = {
  id: string;
  owner_user_id: string;
};

function isCanonicalPrimaryOwner(
  userId: string,
  userEmail: string | null | undefined,
) {
  if (userId === PRIMARY_OWNER_UID) {
    return true;
  }

  return (userEmail ?? "").trim().toLowerCase() === buildLoginEmail(PRIMARY_OWNER_NAME).toLowerCase();
}

async function ensurePrimaryLeagueStructure(admin: AdminClient, leagueId: string) {
  const { data: tournament, error: tournamentError } = await admin
    .from("tournaments")
    .select("id")
    .or(`id.eq.${PRIMARY_TOURNAMENT_ID},slug.eq.${PRIMARY_TOURNAMENT_SLUG}`)
    .limit(1)
    .maybeSingle();

  if (tournamentError) {
    throw tournamentError;
  }

  if (!tournament) {
    return;
  }

  const { data: leagueTournament, error: leagueTournamentError } = await admin
    .from("league_tournaments")
    .upsert(
      {
        league_id: leagueId,
        tournament_id: tournament.id,
      },
      { onConflict: "league_id,tournament_id" },
    )
    .select("id")
    .single();

  if (leagueTournamentError || !leagueTournament) {
    throw leagueTournamentError ?? new Error("Unable to resolve the league tournament.");
  }

  for (const rule of DEFAULT_STAGE_SCORING_RULES) {
    const { error } = await admin.from("stage_scoring_rules").upsert(
      {
        league_tournament_id: leagueTournament.id,
        stage: rule.stage,
        outcome_points: rule.outcomePoints,
        goal_difference_points: rule.goalDifferencePoints,
        exact_score_points: rule.exactScorePoints,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "league_tournament_id,stage" },
    );

    if (error) {
      throw error;
    }
  }

  for (const deadline of DEFAULT_PHASE_DEADLINES) {
    const { error } = await admin.from("phase_deadlines").upsert(
      {
        league_tournament_id: leagueTournament.id,
        stage: deadline.stage,
        deadline_at: deadline.deadlineAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "league_tournament_id,stage" },
    );

    if (error) {
      throw error;
    }
  }
}

async function ensurePrimaryLeague(
  admin: AdminClient,
  userId: string,
  userEmail: string | null | undefined,
  displayName: string,
  platformRole: "platform_admin" | null,
): Promise<LeagueRecord> {
  const { data: existingLeague, error: existingLeagueError } = await admin
    .from("leagues")
    .select("id,owner_user_id")
    .eq("slug", PRIMARY_LEAGUE_SLUG)
    .maybeSingle<LeagueRecord>();

  if (existingLeagueError) {
    throw existingLeagueError;
  }

  if (existingLeague) {
    if (isCanonicalPrimaryOwner(userId, userEmail)) {
      if (existingLeague.owner_user_id !== userId) {
        const { data: transferredLeague, error: transferredLeagueError } = await admin
          .from("leagues")
          .update({
            owner_user_id: userId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLeague.id)
          .select("id,owner_user_id")
          .single<LeagueRecord>();

        if (transferredLeagueError || !transferredLeague) {
          throw transferredLeagueError ?? new Error("Unable to transfer the primary league owner.");
        }

        await ensurePrimaryLeagueStructure(admin, transferredLeague.id);
        return transferredLeague;
      }

      await ensurePrimaryLeagueStructure(admin, existingLeague.id);
    }

    return existingLeague;
  }

  if (!isCanonicalPrimaryOwner(userId, userEmail)) {
    throw new Error("The primary family league is not set up yet. Sign in as Luisa first so the owner account can create it.");
  }

  const { data: insertedLeague, error: insertedLeagueError } = await admin
    .from("leagues")
    .insert({
      name: PRIMARY_LEAGUE_NAME,
      slug: PRIMARY_LEAGUE_SLUG,
      description: PRIMARY_LEAGUE_DESCRIPTION,
      owner_user_id: userId,
      is_public: false,
      support_prompt_enabled: true,
      suggested_support_amount_cents: 500,
      default_currency: "EUR",
    })
    .select("id,owner_user_id")
    .single<LeagueRecord>();

  if (insertedLeagueError || !insertedLeague) {
    throw insertedLeagueError ?? new Error("Unable to create the primary league.");
  }

  if (insertedLeague.owner_user_id === userId) {
    await ensurePrimaryLeagueStructure(admin, insertedLeague.id);
  }

  return insertedLeague;
}

export async function ensureLeagueMembershipWithAdmin(
  admin: AdminClient,
  params: {
    userId: string;
    userEmail?: string | null;
    displayName: string;
    platformRole?: "platform_admin" | null;
  },
): Promise<LeagueMembershipBootstrap> {
  const { userId, userEmail = null, displayName, platformRole = null } = params;
  const isPrimaryOwner = isCanonicalPrimaryOwner(userId, userEmail);

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      full_name: displayName,
      display_name: displayName,
      platform_role: platformRole,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw profileError;
  }

  const league = await ensurePrimaryLeague(admin, userId, userEmail, displayName, platformRole);

  const { data: existingMember, error: existingMemberError } = await admin
    .from("league_members")
    .select("id")
    .eq("league_id", league.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMemberError) {
    throw existingMemberError;
  }

  if (existingMember) {
    return {
      leagueId: league.id,
      memberId: existingMember.id,
    };
  }

  const { data: insertedMember, error: insertedMemberError } = await admin
    .from("league_members")
    .insert({
      league_id: league.id,
      user_id: userId,
      role: isPrimaryOwner && league.owner_user_id === userId ? "owner" : "member",
    })
    .select("id")
    .single();

  if (insertedMemberError || !insertedMember) {
    throw insertedMemberError ?? new Error("Unable to create league membership.");
  }

  return {
    leagueId: league.id,
    memberId: insertedMember.id,
  };
}
