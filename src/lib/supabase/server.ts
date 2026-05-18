import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient(options?: { useServiceRole?: boolean }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = options?.useServiceRole
    ? process.env.SUPABASE_SECRET_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  }

  if (!key) {
    throw new Error(
      options?.useServiceRole
        ? "SUPABASE_SECRET_KEY is required"
        : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required",
    );
  }

  if (options?.useServiceRole) {
    return createSupabaseClient(supabaseUrl, key);
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
            cookieStore.set(name, value, cookieOptions);
          });
        } catch {
          // Server Components cannot set cookies; route handlers and server actions can.
        }
      },
    },
  });
}
