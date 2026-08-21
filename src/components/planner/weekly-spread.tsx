import { Temporal } from "@js-temporal/polyfill";

import { DaySection } from "./day-section";
import type { DaySectionItem } from "./day-section";
import { WeekNavigator } from "./week-navigator";

export type WeeklySpreadItem = DaySectionItem;

type WeeklySpreadProps = {
  weekStartDate: string;
  currentWeekStartDate: string;
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
  currentWeekStartDate,
  items,
  weeklyNote,
}: WeeklySpreadProps) {
  const weekDays = getWeekDays(weekStartDate);

  const leftPage = weekDays.slice(0, 3);
  const rightPage = weekDays.slice(3);

  return (
    <main className="min-h-screen bg-[var(--tm-paper-desk)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-[var(--tm-secondary)]">
            Weekly Spread
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-[var(--tm-text)]">
              Week of{" "}
              <time dateTime={weekStartDate}>
                {new Intl.DateTimeFormat("en", {
                  day: "numeric",
                  month: "long",
                  timeZone: "UTC",
                }).format(new Date(`${weekStartDate}T00:00:00Z`))}
              </time>
            </h1>
            <WeekNavigator
              currentWeekStartDate={currentWeekStartDate}
              variant="header"
              weekStartDate={weekStartDate}
            />
          </div>
        </header>

        <div
          className="mx-auto w-full max-w-[1400px] overflow-hidden rounded-xl bg-[var(--tm-rule)] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.12)] lg:grid lg:grid-cols-2"
          data-testid="notebook-spread"
        >
          <div className="flex flex-col gap-4 bg-gradient-to-r from-[var(--tm-paper)] to-[var(--tm-paper-deep)] p-5 lg:border-r lg:border-[var(--tm-rule-strong)]">
            {leftPage.map((day) => (
              <DaySection
                dateISO={day.dateISO}
                dayName={day.dayName}
                items={items}
                key={day.dateISO}
              />
            ))}
          </div>

          <div className="flex flex-col gap-4 bg-gradient-to-l from-[var(--tm-paper)] to-[var(--tm-paper-deep)] p-5">
            {rightPage.map((day) => (
              <DaySection
                dateISO={day.dateISO}
                dayName={day.dayName}
                items={items}
                key={day.dateISO}
              />
            ))}

            <section className="flex min-h-48 flex-col rounded-lg border border-[var(--tm-rule-strong)] bg-[var(--tm-paper-elevated)] shadow-sm">
              <header className="border-b border-[var(--tm-rule)] px-4 py-3">
                <h2 className="font-serif text-lg font-semibold text-[var(--tm-text)]">
                  Weekly Notes
                </h2>
              </header>
              <div
                className="min-h-32 whitespace-pre-wrap p-4 text-sm leading-6 text-[var(--tm-text)]"
                dir="auto"
              >
                {weeklyNote || (
                  <span className="text-[var(--tm-text-muted)]">
                    No notes yet.
                  </span>
                )}
              </div>
            </section>
          </div>
        </div>

        <WeekNavigator
          currentWeekStartDate={currentWeekStartDate}
          variant="footer"
          weekStartDate={weekStartDate}
        />
      </div>
    </main>
  );
}
