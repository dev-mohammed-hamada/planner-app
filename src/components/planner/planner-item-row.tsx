import {
  IconDeviceFloppy,
  IconSquare,
  IconSquareCheckFilled,
  IconTrash,
} from "@tabler/icons-react";

import {
  completePlannerItemAction,
  deletePlannerItemAction,
  editPlannerItemAction,
} from "@/app/(app)/planner/actions";
import type { DayBlock } from "@/lib/planner/types";

export type PlannerItemRowItem = {
  id: string;
  title: string;
  item_date: string | null;
  item_time: string | null;
  block: DayBlock;
  status: "active" | "completed" | "deleted";
};

type PlannerItemRowProps = {
  item: PlannerItemRowItem;
};

const editableBlocks: Array<{ value: DayBlock; label: string }> = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "unsorted", label: "Unsorted" },
];

function formatTime(time: string | null) {
  if (!time) {
    return null;
  }

  return time.slice(0, 5);
}

export function PlannerItemRow({ item }: PlannerItemRowProps) {
  const isCompleted = item.status === "completed";
  const time = formatTime(item.item_time);

  return (
    <li className="min-h-7 py-1">
      <div className="flex items-start gap-2">
        <form action={completePlannerItemAction} className="shrink-0">
          <input name="itemId" type="hidden" value={item.id} />
          <button
            aria-label={isCompleted ? "Item completed" : "Complete item"}
            className="mt-0.5 inline-flex size-5 items-center justify-center rounded-sm text-[var(--tm-text-muted)] hover:text-[var(--tm-secondary)] disabled:opacity-70"
            disabled={isCompleted}
            type="submit"
          >
            {isCompleted ? (
              <IconSquareCheckFilled
                className="size-4 text-[var(--tm-secondary)]"
                aria-hidden="true"
              />
            ) : (
              <IconSquare className="size-4" aria-hidden="true" />
            )}
          </button>
        </form>
        {time ? (
          <time
            className="w-12 shrink-0 pt-px text-xs font-semibold tabular-nums text-[var(--tm-secondary)]"
            dateTime={time}
          >
            {time}
          </time>
        ) : null}
        <form
          action={editPlannerItemAction}
          className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-2"
        >
          <input name="itemId" type="hidden" value={item.id} />
          <input name="itemDate" type="hidden" value={item.item_date ?? ""} />
          <input
            aria-label="Item title"
            className={`min-w-0 rounded-sm bg-transparent px-1 py-0 text-sm leading-6 text-[var(--tm-text)] outline-none focus:bg-[var(--tm-secondary-soft)] ${
              isCompleted ? "text-[var(--tm-text-muted)] line-through" : ""
            }`}
            defaultValue={item.title}
            dir="auto"
            name="title"
          />
          <select
            aria-label="Move item"
            className="h-7 rounded-sm bg-transparent text-xs text-[var(--tm-text-muted)] outline-none focus:bg-[var(--tm-secondary-soft)]"
            defaultValue={item.block}
            name="block"
          >
            {editableBlocks.map((block) => (
              <option key={block.value} value={block.value}>
                {block.label}
              </option>
            ))}
          </select>
          <button
            aria-label="Save item"
            className="inline-flex size-7 items-center justify-center rounded-sm text-[var(--tm-secondary)] hover:bg-[var(--tm-secondary-soft)]"
            type="submit"
          >
            <IconDeviceFloppy className="size-4" aria-hidden="true" />
          </button>
        </form>
        <form action={deletePlannerItemAction} className="shrink-0">
          <input name="itemId" type="hidden" value={item.id} />
          <button
            aria-label="Delete item"
            className="inline-flex size-7 items-center justify-center rounded-sm text-[var(--tm-text-muted)] hover:text-[var(--tm-error)]"
            type="submit"
          >
            <IconTrash className="size-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </li>
  );
}
