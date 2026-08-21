import { Temporal } from "@js-temporal/polyfill";

import { WeeklySpread } from "@/components/planner/weekly-spread";
import type { WeeklySpreadItem } from "@/components/planner/weekly-spread";
import { requireInvitedUser } from "@/lib/auth/guard";
import {
  getSaturdayWeekStart,
  resolveWeekParam,
  todayInTimezone,
} from "@/lib/planner/dates";

export const dynamic = "force-dynamic";

function weekEndDate(weekStartDate: string) {
  return Temporal.PlainDate.from(weekStartDate).add({ days: 6 }).toString();
}

type PlannerPageProps = {
  searchParams: Promise<{ week?: string }>;
};

export default async function PlannerPage({ searchParams }: PlannerPageProps) {
  const { supabase, user } = await requireInvitedUser("/planner");

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();

  const timezone = profile?.timezone || "Asia/Gaza";
  const today = todayInTimezone(timezone);
  const currentWeekStartDate = getSaturdayWeekStart(today);
  const { week } = await searchParams;
  const weekStartDate = resolveWeekParam(week, today);
  const weekEnd = weekEndDate(weekStartDate);

  const [{ data: plannerItems }, { data: weeklyNote }] = await Promise.all([
    supabase
      .from("planner_items")
      .select("id,title,item_date,item_time,block,status")
      .eq("user_id", user.id)
      .eq("bucket", "weekly_spread")
      .neq("status", "deleted")
      .gte("item_date", weekStartDate)
      .lte("item_date", weekEnd)
      .order("item_date", { ascending: true })
      .order("item_time", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("weekly_notes")
      .select("content")
      .eq("user_id", user.id)
      .eq("week_start_date", weekStartDate)
      .maybeSingle(),
  ]);

  return (
    <WeeklySpread
      currentWeekStartDate={currentWeekStartDate}
      items={(plannerItems ?? []) as WeeklySpreadItem[]}
      weekStartDate={weekStartDate}
      weeklyNote={weeklyNote?.content ?? ""}
    />
  );
}
