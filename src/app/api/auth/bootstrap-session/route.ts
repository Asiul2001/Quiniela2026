import { NextResponse } from "next/server";
import { buildLoginEmail } from "@/lib/access-codes";
import { getUserDisplayName } from "@/lib/auth";
import { PRIMARY_OWNER_NAME } from "@/lib/app-config";
import { ensureLeagueMembershipWithAdmin } from "@/lib/account-bootstrap";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function POST(request: Request) {
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
            : "Server-side session bootstrap is not configured.",
      },
      { status: 500 },
    );
  }

  try {
    const { data, error } = await admin.auth.getUser(token);

    if (error || !data.user) {
      const message = error?.message ?? "Unable to verify the current session.";
      console.error("bootstrap-session auth verification failed", { token: token?.slice(0, 20), error, message });
      return NextResponse.json({ error: message }, { status: 401 });
    }

    const displayName = getUserDisplayName(data.user) ?? "Player";

    const membership = await ensureLeagueMembershipWithAdmin(admin, {
      userId: data.user.id,
      userEmail: data.user.email,
      displayName,
      platformRole:
        data.user.email?.trim().toLowerCase() === buildLoginEmail(PRIMARY_OWNER_NAME).toLowerCase()
          ? "platform_admin"
          : null,
    });

    return NextResponse.json(membership);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error, null, 2) ?? "Unable to bootstrap the current account.";
    console.error("bootstrap-session failed", {
      token: token?.slice(0, 20),
      error,
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
