import { NextResponse } from "next/server";
import {
  buildLoginEmail,
  buildSupabasePasswordFromAccessCode,
  generateAccessCode,
} from "@/lib/access-codes";
import { ensureLeagueMembershipWithAdmin } from "@/lib/account-bootstrap";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type CreateAccountBody = {
  name?: string;
};

export async function POST(request: Request) {
  let body: CreateAccountBody;

  try {
    body = (await request.json()) as CreateAccountBody;
  } catch {
    return NextResponse.json({ error: "Invalid account creation request." }, { status: 400 });
  }

  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Enter a name to create an account." }, { status: 400 });
  }

  let admin;

  try {
    admin = getSupabaseAdmin();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Server-side account creation is not configured yet.";

    return NextResponse.json({ error: message }, { status: 500 });
  }

  const email = buildLoginEmail(name);

  try {
    const { data: existingUsers, error: existingError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (existingError) {
      throw existingError;
    }

    const alreadyExists = existingUsers.users.some((user) => user.email?.toLowerCase() === email.toLowerCase());

    if (alreadyExists) {
      return NextResponse.json(
        { error: "That name already has an account. Sign in instead." },
        { status: 409 },
      );
    }

    let accessCode = "";
    let created = false;
    let attempts = 0;

    while (!created && attempts < 12) {
      attempts += 1;
      accessCode = generateAccessCode();

      const { data: createdUser, error } = await admin.auth.admin.createUser({
        email,
        password: buildSupabasePasswordFromAccessCode(accessCode),
        email_confirm: true,
        user_metadata: {
          display_name: name,
          full_name: name,
          access_code: accessCode,
        },
      });

      if (!error) {
        if (!createdUser.user) {
          throw new Error("The account was created, but the user record was missing.");
        }

        await ensureLeagueMembershipWithAdmin(admin, {
          userId: createdUser.user.id,
          userEmail: createdUser.user.email,
          displayName: name,
          platformRole: null,
        });
        created = true;
        break;
      }

      if (/already registered|already been registered|user already exists/i.test(error.message)) {
        return NextResponse.json(
          { error: "That name already has an account. Sign in instead." },
          { status: 409 },
        );
      }

      throw error;
    }

    if (!created || !accessCode) {
      return NextResponse.json(
        { error: "Unable to generate a unique 4-character access code. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ accessCode });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create account.";

    return NextResponse.json(
      {
        error:
          /rate limit/i.test(message)
            ? "Account creation is being blocked by the current Supabase settings."
            : message,
      },
      { status: 500 },
    );
  }
}
