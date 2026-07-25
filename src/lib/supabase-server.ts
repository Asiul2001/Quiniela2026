import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const hasSupabaseServerEnv = Boolean(supabaseUrl && supabaseAnonKey);

function looksLikeJwt(value: string) {
  return value.split(".").length === 3;
}

export function getSupabaseServerClient() {
  if (!hasSupabaseServerEnv) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.");
  }

  if (!looksLikeJwt(supabaseAnonKey)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not a valid Supabase anon key.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
