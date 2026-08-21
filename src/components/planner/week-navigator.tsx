import { Temporal } from "@js-temporal/polyfill";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";

type Variant = "header" | "footer";

type WeekNavigatorProps = {
  weekStartDate: string;
  currentWeekStartDate: string;
  variant: Variant;
};

function shiftWeek(weekStartDate: string, deltaDays: number): string {
  return Temporal.PlainDate.from(weekStartDate).add({ days: deltaDays }).toString();
}

function formatWeekLabel(weekStartDate: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${weekStartDate}T00:00:00Z`));
}

export function WeekNavigator({
  weekStartDate,
  currentWeekStartDate,
  variant,
}: WeekNavigatorProps) {
  const prevHref = `/planner?week=${shiftWeek(weekStartDate, -7)}`;
  const nextHref = `/planner?week=${shiftWeek(weekStartDate, 7)}`;
  const isCurrentWeek = weekStartDate === currentWeekStartDate;

  const linkBase =
    "inline-flex items-center justify-center rounded-md border border-[var(--tm-rule-strong)] bg-[var(--tm-paper-elevated)] text-[var(--tm-text)] transition-colors hover:bg-[var(--tm-paper-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tm-secondary)]";

  if (variant === "footer") {
    return (
      <nav
        aria-label="Week navigation"
        className="mx-auto flex w-full max-w-[1400px] items-center justify-center gap-6 py-2"
      >
        <Link aria-label="Previous week" className={`${linkBase} h-11 w-11`} href={prevHref}>
          <IconChevronLeft size={22} />
        </Link>
        {!isCurrentWeek && (
          <Link
            aria-label="Jump to today"
            className={`${linkBase} h-11 px-4 text-sm font-medium`}
            href="/planner"
          >
            Today
          </Link>
        )}
        <Link aria-label="Next week" className={`${linkBase} h-11 w-11`} href={nextHref}>
          <IconChevronRight size={22} />
        </Link>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Week navigation"
      className="flex items-center gap-3 text-sm text-[var(--tm-text)]"
    >
      <Link aria-label="Previous week" className={`${linkBase} h-8 w-8`} href={prevHref}>
        <IconChevronLeft size={16} />
      </Link>
      <span className="font-medium">Week of {formatWeekLabel(weekStartDate)}</span>
      {!isCurrentWeek && (
        <Link
          aria-label="Jump to today"
          className={`${linkBase} h-8 px-3 text-xs font-medium`}
          href="/planner"
        >
          Today
        </Link>
      )}
      <Link aria-label="Next week" className={`${linkBase} h-8 w-8`} href={nextHref}>
        <IconChevronRight size={16} />
      </Link>
    </nav>
  );
}
