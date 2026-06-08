import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasSupabaseAdminEnv = Boolean(supabaseUrl && supabaseServiceRoleKey);

function looksLikeJwt(value: string) {
  return value.split(".").length === 3;
}

export function getSupabaseAdmin() {
  if (!hasSupabaseAdminEnv) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Server-side account creation needs the Supabase service role key.",
    );
  }

  if (!looksLikeJwt(supabaseServiceRoleKey)) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not a valid Supabase service-role key. Right now it looks like a placeholder or access code, not the real key from your Supabase project settings.",
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
