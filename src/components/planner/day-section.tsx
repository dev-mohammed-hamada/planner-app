import type { DayBlock } from "@/lib/planner/types";

import { PlannerItemRow } from "./planner-item-row";
import type { PlannerItemRowItem } from "./planner-item-row";

export type DaySectionItem = PlannerItemRowItem & {
  item_date: string | null;
  block: DayBlock;
};

type DaySectionProps = {
  dateISO: string;
  dayName: string;
  items: DaySectionItem[];
};

const blocks: Array<{ key: DayBlock; label: string }> = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
  { key: "unsorted", label: "Unsorted" },
];

function formatDayNumber(dateISO: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateISO}T00:00:00Z`));
}

export function DaySection({ dateISO, dayName, items }: DaySectionProps) {
  return (
    <section className="flex min-h-72 flex-col rounded-lg border border-[var(--tm-rule-strong)] bg-[var(--tm-paper-elevated)] shadow-sm">
      <header className="flex items-baseline justify-between border-b border-[var(--tm-rule)] px-4 py-2.5">
        <h2 className="font-serif text-xl font-semibold text-[var(--tm-text)]">
          {dayName}
        </h2>
        <time
          className="text-xs font-medium uppercase tracking-wide text-[var(--tm-text-muted)]"
          dateTime={dateISO}
        >
          {formatDayNumber(dateISO)}
        </time>
      </header>
      <div className="flex flex-1 flex-col gap-3 p-3">
        {blocks.map((block) => {
          const blockItems = items.filter(
            (item) => item.item_date === dateISO && item.block === block.key,
          );

          return (
            <div key={block.key} className="min-h-14">
              <h3 className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--tm-text-muted)]">
                {block.label}
              </h3>
              {blockItems.length > 0 ? (
                <ul className="divide-y divide-[var(--tm-rule)]">
                  {blockItems.map((item) => (
                    <PlannerItemRow item={item} key={item.id} />
                  ))}
                </ul>
              ) : (
                <div className="h-6 border-b border-dashed border-[var(--tm-rule)]" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
