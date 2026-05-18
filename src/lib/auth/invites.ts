import type { SupabaseClient } from "@supabase/supabase-js";

type AuthInvite = {
  active: boolean;
  expires_at: string | null;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function isEmailInvited(
  supabase: SupabaseClient,
  email: string,
  now = new Date(),
) {
  const normalizedEmail = normalizeEmail(email);

  const { data, error } = await supabase
    .from("auth_invites")
    .select("active,expires_at")
    .eq("email", normalizedEmail)
    .maybeSingle<AuthInvite>();

  if (error) {
    throw error;
  }

  if (!data?.active) {
    return false;
  }

  if (!data.expires_at) {
    return true;
  }

  return Date.parse(data.expires_at) > now.getTime();
}
