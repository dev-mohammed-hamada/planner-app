"use server";

import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isEmailInvited, normalizeEmail } from "@/lib/auth/invites";
import { appOriginFromHeaders, sanitizeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export type MagicLinkActionState = {
  message?: string;
  error?: string;
};

type RequestMagicLinkInput = {
  email: string;
  next: string;
  origin: string;
};

const neutralMessage = "If this email has access, we sent a sign-in link.";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function requestMagicLinkForEmail(
  authSupabase: SupabaseClient,
  inviteSupabase: SupabaseClient,
  input: RequestMagicLinkInput,
) {
  const email = normalizeEmail(input.email);

  if (!isValidEmail(email)) {
    return { status: "invalid_email" as const };
  }

  const invited = await isEmailInvited(inviteSupabase, email);

  if (!invited) {
    return { status: "not_invited" as const };
  }

  const nextPath = sanitizeNextPath(input.next);
  const emailRedirectTo = `${input.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const { error } = await authSupabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  });

  if (error) {
    throw error;
  }

  return { status: "sent" as const };
}

export async function requestMagicLinkAction(
  previousState: MagicLinkActionState,
  formData: FormData,
): Promise<MagicLinkActionState> {
  void previousState;

  const email = String(formData.get("email") ?? "");
  const next = String(formData.get("next") ?? "/planner");

  const authSupabase = await createClient();
  const inviteSupabase = await createClient({ useServiceRole: true });
  const headerStore = await headers();
  const origin = appOriginFromHeaders(
    headerStore.get("host"),
    headerStore.get("x-forwarded-proto"),
  );

  try {
    const result = await requestMagicLinkForEmail(authSupabase, inviteSupabase, {
      email,
      next,
      origin,
    });

    if (result.status === "invalid_email") {
      return { error: "Enter a valid email address." };
    }

    return { message: neutralMessage };
  } catch (error) {
    console.error("Could not send magic link", error);

    return { message: neutralMessage };
  }
}
