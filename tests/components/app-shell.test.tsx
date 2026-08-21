import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/calendar",
}));

import { AppShell } from "@/components/app/app-shell";

describe("AppShell", () => {
  it("renders platform navigation with Calendar marked as current", () => {
    render(
      <AppShell>
        <main>Calendar body</main>
      </AppShell>,
    );

    const weekLinks = screen.getAllByRole("link", { name: "Week" });
    const calendarLinks = screen.getAllByRole("link", { name: "Calendar" });
    const notesLinks = screen.getAllByRole("link", { name: "Notes" });
    const settingsLinks = screen.getAllByRole("link", { name: "Settings" });

    expect(screen.getByText("Time Manager")).toBeInTheDocument();
    expect(weekLinks).toHaveLength(2);
    expect(calendarLinks).toHaveLength(2);
    expect(notesLinks).toHaveLength(2);
    expect(settingsLinks).toHaveLength(2);
    weekLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/planner");
    });
    calendarLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/calendar");
      expect(link).toHaveAttribute("aria-current", "page");
    });
    notesLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/notes");
    });
    settingsLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/settings");
    });
    expect(screen.getByRole("button", { name: "Quick add" })).toBeInTheDocument();
    expect(screen.getByText("Calendar body")).toBeInTheDocument();
  });
});
