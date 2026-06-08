import { NextResponse } from "next/server";
import {
  PRIMARY_OWNER_ACCESS_CODE,
  PRIMARY_OWNER_NAME,
} from "@/lib/app-config";
import {
  buildLoginEmail,
  buildSupabasePasswordFromAccessCode,
} from "@/lib/access-codes";
import { ensureLeagueMembershipWithAdmin } from "@/lib/account-bootstrap";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  let admin;

  try {
    admin = getSupabaseAdmin();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Server-side owner bootstrap is not configured.",
      },
      { status: 500 },
    );
  }

  const email = buildLoginEmail(PRIMARY_OWNER_NAME);
  const password = buildSupabasePasswordFromAccessCode(PRIMARY_OWNER_ACCESS_CODE);

  try {
    const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      throw listError;
    }

    const existingUser = usersPage.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

    let ownerUserId = existingUser?.id;

    if (existingUser) {
      const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          display_name: PRIMARY_OWNER_NAME,
          full_name: PRIMARY_OWNER_NAME,
          access_code: PRIMARY_OWNER_ACCESS_CODE,
        },
      });

      if (updateError) {
        throw updateError;
      }
    } else {
      const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: PRIMARY_OWNER_NAME,
          full_name: PRIMARY_OWNER_NAME,
          access_code: PRIMARY_OWNER_ACCESS_CODE,
        },
      });

      if (createError || !createdUser.user) {
        throw createError ?? new Error("Unable to create the Luisa admin account.");
      }

      ownerUserId = createdUser.user.id;
    }

    if (!ownerUserId) {
      throw new Error("Unable to resolve the Luisa admin account.");
    }

    await ensureLeagueMembershipWithAdmin(admin, {
      userId: ownerUserId,
      userEmail: email,
      displayName: PRIMARY_OWNER_NAME,
      platformRole: "platform_admin",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to bootstrap the Luisa admin account.",
      },
      { status: 500 },
    );
  }
}
