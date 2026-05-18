import { redirect } from "next/navigation";

import { rejectedAuthPathFor, resolveAuthAccess } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const inviteSupabase = await createClient({ useServiceRole: true });
  const access = await resolveAuthAccess(supabase, inviteSupabase);

  if (access.status === "allowed") {
    redirect("/planner");
  }

  if (access.status === "rejected") {
    redirect(rejectedAuthPathFor("/planner"));
  }

  redirect("/auth/login");
}
