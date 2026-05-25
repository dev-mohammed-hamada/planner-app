"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconCalendarWeek,
  IconNotes,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react";

type AppShellProps = {
  children: ReactNode;
  quickAddSlot?: ReactNode;
};

const navItems = [
  { href: "/planner", label: "Week", icon: IconCalendarWeek },
  { href: "/calendar", label: "Calendar", icon: IconCalendar },
  { href: "/notes", label: "Notes", icon: IconNotes },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, quickAddSlot }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="tm-app-shell min-h-screen bg-[var(--tm-surface-base)] text-[var(--tm-text)]">
      <header className="tm-topbar">
        <Link className="tm-brand" href="/planner">
          Time Manager
        </Link>
        <nav aria-label="Primary" className="tm-desktop-nav">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={active ? "tm-nav-link tm-nav-link-active" : "tm-nav-link"}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button className="tm-button tm-button-primary" type="button">
          <IconPlus aria-hidden="true" className="size-4" />
          Quick add
        </button>
      </header>
      <div className="pb-20 md:pb-0">{children}</div>
      <nav aria-label="Mobile primary" className="tm-mobile-nav">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "tm-mobile-nav-link tm-mobile-nav-link-active"
                  : "tm-mobile-nav-link"
              }
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      {quickAddSlot}
    </div>
  );
}
