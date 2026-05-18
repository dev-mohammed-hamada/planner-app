import { IconCircle, IconCircleCheckFilled } from "@tabler/icons-react";

export type PlannerItemRowItem = {
  id: string;
  title: string;
  item_time: string | null;
  status: "active" | "completed" | "deleted";
};

type PlannerItemRowProps = {
  item: PlannerItemRowItem;
};

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
    <li className="flex min-h-8 items-start gap-2 py-1.5">
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {isCompleted ? (
          <IconCircleCheckFilled className="planner-done size-4" />
        ) : (
          <IconCircle className="planner-ink-faint size-4" />
        )}
      </span>
      {time ? (
        <time
          className="planner-ink-faint w-12 shrink-0 pt-px text-xs font-medium tabular-nums"
          dateTime={time}
        >
          {time}
        </time>
      ) : null}
      <span
        className={`planner-ink min-w-0 text-sm leading-6 ${
          isCompleted ? "planner-ink-faint line-through" : ""
        }`}
        dir="auto"
      >
        {item.title}
      </span>
    </li>
  );
}
