import { Temporal } from "@js-temporal/polyfill";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";

import { PlannerItemRow } from "@/components/planner/planner-item-row";
import type { DayBlock } from "@/lib/planner/types";

export type CalendarDayItem = {
  id: string;
  title: string;
  item_date: string | null;
  item_time: string | null;
  block: DayBlock;
  status: "active" | "completed" | "deleted";
};

type CalendarDayViewProps = {
  dateISO: string;
  items: CalendarDayItem[];
};

const MIN_ROWS = 6;

function formatWeekday(dateISO: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${dateISO}T00:00:00Z`));
}

export function CalendarDayView({ dateISO, items }: CalendarDayViewProps) {
  const weekday = formatWeekday(dateISO);
  const date = Temporal.PlainDate.from(dateISO);
  const prevDate = date.subtract({ days: 1 }).toString();
  const nextDate = date.add({ days: 1 }).toString();
  const emptyRows = Math.max(MIN_ROWS - items.length, 0);

  return (
    <main className="planner-paper min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <header className="flex items-center justify-between">
          <Link
            aria-label="Previous day"
            className="planner-ink-faint inline-flex size-8 items-center justify-center rounded-sm hover:text-[#397367]"
            href={`/calendar?date=${prevDate}`}
          >
            <IconChevronLeft className="size-5" aria-hidden="true" />
          </Link>
          <h1 className="planner-ink text-2xl font-semibold tracking-normal">
            {weekday}
          </h1>
          <Link
            aria-label="Next day"
            className="planner-ink-faint inline-flex size-8 items-center justify-center rounded-sm hover:text-[#397367]"
            href={`/calendar?date=${nextDate}`}
          >
            <IconChevronRight className="size-5" aria-hidden="true" />
          </Link>
        </header>

        <ul className="planner-paper-sheet planner-rule flex flex-col rounded-lg border shadow-sm shadow-stone-200/60">
          {items.map((item) => (
            <PlannerItemRow item={item} key={item.id} />
          ))}
          {Array.from({ length: emptyRows }).map((_, index) => (
            <li
              className="planner-divider min-h-8 border-b py-1.5 last:border-b-0"
              data-testid="empty-calendar-row"
              key={`empty-${index}`}
            >
              &nbsp;
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
