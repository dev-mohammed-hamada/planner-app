import { CalendarDayView } from "@/components/calendar/day-view";
import type { CalendarDayItem } from "@/components/calendar/day-view";
import { requireInvitedUser } from "@/lib/auth/guard";
import { todayInTimezone } from "@/lib/planner/dates";

export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateISO(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime());
}

type CalendarPageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const { supabase, user } = await requireInvitedUser("/calendar");

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();

  const timezone = profile?.timezone || "Asia/Gaza";
  const params = await searchParams;
  const requestedDate = params.date;
  const dateISO =
    requestedDate && isValidDateISO(requestedDate)
      ? requestedDate
      : todayInTimezone(timezone);

  const { data: plannerItems } = await supabase
    .from("planner_items")
    .select("id,title,item_date,item_time,block,status")
    .eq("user_id", user.id)
    .eq("item_date", dateISO)
    .eq("bucket", "weekly_spread")
    .neq("status", "deleted")
    .order("item_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  return (
    <CalendarDayView
      dateISO={dateISO}
      items={(plannerItems ?? []) as CalendarDayItem[]}
    />
  );
}
