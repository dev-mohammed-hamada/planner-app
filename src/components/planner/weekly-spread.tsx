import { Temporal } from "@js-temporal/polyfill";

import { DaySection } from "./day-section";
import type { DaySectionItem } from "./day-section";

export type WeeklySpreadItem = DaySectionItem;

type WeeklySpreadProps = {
  weekStartDate: string;
  items: WeeklySpreadItem[];
  weeklyNote: string;
};

const dayNames = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

function getWeekDays(weekStartDate: string) {
  const start = Temporal.PlainDate.from(weekStartDate);

  return dayNames.map((dayName, index) => ({
    dayName,
    dateISO: start.add({ days: index }).toString(),
  }));
}

export function WeeklySpread({
  weekStartDate,
  items,
  weeklyNote,
}: WeeklySpreadProps) {
  const weekDays = getWeekDays(weekStartDate);

  return (
    <main className="planner-paper min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-1">
          <p className="planner-accent text-sm font-semibold">Weekly Spread</p>
          <h1 className="planner-ink text-2xl font-semibold tracking-normal">
            Week of{" "}
            <time dateTime={weekStartDate}>
              {new Intl.DateTimeFormat("en", {
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              }).format(new Date(`${weekStartDate}T00:00:00Z`))}
            </time>
          </h1>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {weekDays.map((day) => (
            <DaySection
              dateISO={day.dateISO}
              dayName={day.dayName}
              items={items}
              key={day.dateISO}
            />
          ))}

          <section className="planner-paper-sheet planner-rule flex min-h-72 flex-col rounded-lg border shadow-sm shadow-stone-200/60 md:col-span-2 xl:col-span-1">
            <header className="planner-divider border-b px-4 py-3">
              <h2 className="planner-ink text-base font-semibold">
                Weekly Notes
              </h2>
            </header>
            <div
              className="planner-ink min-h-52 whitespace-pre-wrap p-4 text-sm leading-6"
              dir="auto"
            >
              {weeklyNote || (
                <span className="planner-ink-faint">No notes yet.</span>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
