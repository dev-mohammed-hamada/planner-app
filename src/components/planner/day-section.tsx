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
    <section className="planner-paper-sheet planner-rule flex min-h-72 flex-col rounded-lg border shadow-sm shadow-stone-200/60">
      <header className="planner-divider flex items-baseline justify-between border-b px-4 py-3">
        <h2 className="planner-ink text-base font-semibold">{dayName}</h2>
        <time className="planner-ink-muted text-sm" dateTime={dateISO}>
          {formatDayNumber(dateISO)}
        </time>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        {blocks.map((block) => {
          const blockItems = items.filter(
            (item) => item.item_date === dateISO && item.block === block.key,
          );

          return (
            <div key={block.key} className="min-h-16">
              <h3 className="planner-ink-muted mb-1 text-[0.7rem] font-semibold uppercase tracking-wide">
                {block.label}
              </h3>
              {blockItems.length > 0 ? (
                <ul className="divide-y planner-divider">
                  {blockItems.map((item) => (
                    <PlannerItemRow item={item} key={item.id} />
                  ))}
                </ul>
              ) : (
                <div className="planner-divider h-7 border-b" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
