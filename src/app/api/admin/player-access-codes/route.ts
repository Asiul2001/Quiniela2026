import { NextResponse } from "next/server";
import {
  buildLoginEmail,
  buildSupabasePasswordFromAccessCode,
  generateAccessCode,
} from "@/lib/access-codes";
import { getUserDisplayName } from "@/lib/auth";
import {
  PRIMARY_OWNER_ACCESS_CODE,
  PRIMARY_OWNER_NAME,
  PRIMARY_OWNER_UID,
} from "@/lib/app-config";
import { ensureLeagueMembershipWithAdmin } from "@/lib/account-bootstrap";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

function isCanonicalOwnerEmail(email: string | null | undefined) {
  return normalizeName(email ?? "") === normalizeName(buildLoginEmail(PRIMARY_OWNER_NAME));
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

  const isPrimaryOwner = isCanonicalOwnerEmail(data.user.email);

  if (!isPrimaryOwner) {
    return { error: NextResponse.json({ error: "Only Luisa can manage player access codes." }, { status: 403 }) };
  }

  return { admin, userId: data.user.id };
}

type AdminPlayerRecord = {
  userId: string;
  name: string;
  accessCode: string | null;
  profileExists: boolean;
  memberExists: boolean;
  platformRole: string | null;
  statusIssue: string | null;
  isPrimaryOwner: boolean;
};

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function getEmailLocalPart(email: string | null | undefined) {
  return (email ?? "").split("@")[0]?.trim().toLowerCase() ?? "";
}

function isPrimaryOwnerUser(user: { id: string; user_metadata?: Record<string, unknown> | null; email?: string | null }) {
  return user.id === PRIMARY_OWNER_UID || isCanonicalOwnerEmail(user.email);
}

function isOwnerDuplicateEmail(user: { email?: string | null }) {
  if (!user.email) {
    return false;
  }

  const emailLocalPart = getEmailLocalPart(user.email);
  const ownerName = normalizeName(PRIMARY_OWNER_NAME);

  if (!emailLocalPart) {
    return false;
  }

  const ownerSegmentRegex = new RegExp(`(^|[._-])${ownerName}($|[._-])`);
  return ownerSegmentRegex.test(emailLocalPart);
}

function isDuplicateOwnerLikeUser(user: {
  id: string;
  user_metadata?: Record<string, unknown> | null;
  email?: string | null;
}) {
  if (isPrimaryOwnerUser(user)) {
    return false;
  }

  const displayName =
    typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "";

  return (
    normalizeName(displayName) === normalizeName(PRIMARY_OWNER_NAME) ||
    isOwnerDuplicateEmail(user)
  );
}

function hasStoredDisplayName(user: { user_metadata?: Record<string, unknown> | null }) {
  return (
    typeof user.user_metadata?.display_name === "string" &&
    user.user_metadata.display_name.trim().length > 0
  );
}

async function listAuthUsers(admin: Awaited<ReturnType<typeof getSupabaseAdmin>>) {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw error;
  }

  return data.users ?? [];
}

async function buildAdminPlayerRecords(
  admin: Awaited<ReturnType<typeof getSupabaseAdmin>>,
): Promise<AdminPlayerRecord[]> {
  const users = await listAuthUsers(admin);
  const userIds = users.map((user) => user.id);

  let profiles: Array<{ id: string; platform_role: string | null }> = [];
  let profilesErrorMessage: string | null = null;

  if (userIds.length) {
    const { data, error } = await admin.from("profiles").select("id, platform_role").in("id", userIds);
    if (error) {
      profilesErrorMessage = error.message;
    } else {
      profiles = data ?? [];
    }
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.platform_role ?? null]),
  );

  let leagueId: string | null = null;
  let membershipErrorMessage: string | null = null;

  let members: Array<{ user_id: string; league_id: string }> = [];

  if (userIds.length) {
    const { data, error } = await admin
      .from("league_members")
      .select("user_id, league_id")
      .in("user_id", userIds);

    if (error) {
      membershipErrorMessage = error.message;
    } else {
      members = data ?? [];
      leagueId =
        members.find((member) => typeof member.league_id === "string" && member.league_id.length > 0)?.league_id ??
        null;
    }
  }

  const memberUserIds = new Set((members ?? []).map((member) => member.user_id));

  return users
    .filter((user) => {
      if (isDuplicateOwnerLikeUser(user)) {
        return false;
      }

      if (isPrimaryOwnerUser(user)) {
        return true;
      }

      if (profileMap.has(user.id) || memberUserIds.has(user.id)) {
        return true;
      }

      return hasStoredDisplayName(user);
    })
    .sort((a, b) => Number(isPrimaryOwnerUser(b)) - Number(isPrimaryOwnerUser(a)))
    .map((user) => ({
      userId: user.id,
      name: isPrimaryOwnerUser(user)
        ? PRIMARY_OWNER_NAME
        : typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name
          : getUserDisplayName(user) ?? "Player",
      accessCode: isPrimaryOwnerUser(user)
        ? PRIMARY_OWNER_ACCESS_CODE
        : typeof user.user_metadata?.access_code === "string"
          ? user.user_metadata.access_code
          : null,
      profileExists: profileMap.has(user.id),
      memberExists: memberUserIds.has(user.id),
      platformRole: isPrimaryOwnerUser(user) ? "platform_admin" : profileMap.get(user.id) ?? null,
      statusIssue: profilesErrorMessage ?? membershipErrorMessage,
      isPrimaryOwner: isPrimaryOwnerUser(user),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const maybeMessage = "message" in error ? error.message : null;
    const maybeDetails = "details" in error ? error.details : null;
    const maybeHint = "hint" in error ? error.hint : null;
    const parts = [maybeMessage, maybeDetails, maybeHint].filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    );

    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  return "Unknown sync error.";
}

export async function GET(request: Request) {
  try {
    const auth = await requirePlatformAdmin(request);
    if ("error" in auth) {
      return auth.error;
    }

    const players = await buildAdminPlayerRecords(auth.admin);

    return NextResponse.json({ players });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load player access codes.",
      },
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
      | { action?: string; userId?: string }
      | null;
    const action = body?.action?.trim();

    if (action === "sync_all") {
      const users = (await listAuthUsers(auth.admin)).sort(
        (a, b) => Number(isPrimaryOwnerUser(b)) - Number(isPrimaryOwnerUser(a)),
      );
      const failures: Array<{ userId: string; name: string; error: string }> = [];
      let repairedCount = 0;

      for (const user of users) {
      if (isDuplicateOwnerLikeUser(user)) {
        const technicalName = getEmailLocalPart(user.email) || "technical-user";

          await auth.admin.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              display_name: technicalName,
              full_name: technicalName,
            },
          });

        const { error: duplicateProfileDeleteError } = await auth.admin
          .from("profiles")
          .delete()
          .eq("id", user.id);

          if (duplicateProfileDeleteError) {
            failures.push({
              userId: user.id,
              name: technicalName,
              error: duplicateProfileDeleteError.message,
            });
          }

        continue;
      }

        if (!hasStoredDisplayName(user) && !isPrimaryOwnerUser(user)) {
          continue;
        }

        const displayName =
          isPrimaryOwnerUser(user)
            ? PRIMARY_OWNER_NAME
            : typeof user.user_metadata?.display_name === "string"
              ? user.user_metadata.display_name
            : getUserDisplayName(user) ?? "Player";

        try {
          await ensureLeagueMembershipWithAdmin(auth.admin, {
            userId: user.id,
            userEmail: user.email,
            displayName,
            platformRole: isPrimaryOwnerUser(user) ? "platform_admin" : null,
          });
          repairedCount += 1;
        } catch (error) {
          failures.push({
            userId: user.id,
            name: displayName,
            error: normalizeUnknownError(error),
          });
        }
      }

      const players = await buildAdminPlayerRecords(auth.admin);

      return NextResponse.json({
        repairedCount,
        failedCount: failures.length,
        failures,
        players,
      });
    }

    const userId = body?.userId?.trim();

    if (!userId) {
      return NextResponse.json({ error: "Choose a player before regenerating an access code." }, { status: 400 });
    }

    const { data, error } = await auth.admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const targetUser = data.users.find((user) => user.id === userId);

    if (!targetUser) {
      return NextResponse.json({ error: "That player account could not be found." }, { status: 404 });
    }

    if (isPrimaryOwnerUser(targetUser)) {
      return NextResponse.json(
        { error: "Luisa keeps the fixed owner access code 2569 and does not need regeneration." },
        { status: 400 },
      );
    }

    const accessCode = generateAccessCode();
    const displayName =
      typeof targetUser.user_metadata?.display_name === "string"
        ? targetUser.user_metadata.display_name
        : getUserDisplayName(targetUser) ?? "Player";

    const { error: updateError } = await auth.admin.auth.admin.updateUserById(userId, {
      password: buildSupabasePasswordFromAccessCode(accessCode),
      email_confirm: true,
      user_metadata: {
        ...targetUser.user_metadata,
        display_name: displayName,
        full_name: displayName,
        access_code: accessCode,
      },
    });

    if (updateError) {
      throw updateError;
    }

    await ensureLeagueMembershipWithAdmin(auth.admin, {
      userId,
      userEmail: targetUser.email,
      displayName,
      platformRole: isPrimaryOwnerUser(targetUser) ? "platform_admin" : null,
    });

    return NextResponse.json({
      userId,
      name: displayName,
      accessCode,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to regenerate the access code.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requirePlatformAdmin(request);
    if ("error" in auth) {
      return auth.error;
    }

    const body = (await request.json().catch(() => null)) as { userId?: string } | null;
    const userId = body?.userId?.trim();

    if (!userId) {
      return NextResponse.json({ error: "Choose a player before deleting an account." }, { status: 400 });
    }

    if (userId === auth.userId) {
      return NextResponse.json({ error: "Luisa cannot delete her own admin account here." }, { status: 400 });
    }

    const { data, error } = await auth.admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const targetUser = data.users.find((user) => user.id === userId);

    if (!targetUser) {
      return NextResponse.json({ error: "That player account could not be found." }, { status: 404 });
    }

    const displayName =
      typeof targetUser.user_metadata?.display_name === "string"
        ? targetUser.user_metadata.display_name
        : getUserDisplayName(targetUser) ?? "Player";

    if (isPrimaryOwnerUser(targetUser)) {
      return NextResponse.json({ error: "The Luisa owner account cannot be deleted from this panel." }, { status: 400 });
    }

    const { data: memberships, error: membershipsError } = await auth.admin
      .from("league_members")
      .select("id")
      .eq("user_id", userId);

    if (membershipsError) {
      throw membershipsError;
    }

    const memberIds = (memberships ?? []).map((membership) => membership.id);

    if (memberIds.length) {
      const { error: predictionsError } = await auth.admin
        .from("predictions")
        .delete()
        .in("member_id", memberIds);

      if (predictionsError) {
        throw predictionsError;
      }
    }

    const { error: membersDeleteError } = await auth.admin
      .from("league_members")
      .delete()
      .eq("user_id", userId);

    if (membersDeleteError) {
      throw membersDeleteError;
    }

    const { error: profileDeleteError } = await auth.admin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      throw profileDeleteError;
    }

    const { error: deleteError } = await auth.admin.auth.admin.deleteUser(userId, false);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      userId,
      name: displayName,
      deleted: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to delete the player account.",
      },
      { status: 500 },
    );
  }
}
