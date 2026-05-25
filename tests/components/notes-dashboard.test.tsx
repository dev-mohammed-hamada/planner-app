import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NotesDashboard } from "@/components/notes/notes-dashboard";

describe("NotesDashboard", () => {
  it("renders future notes, inbox captures, and weekly note archive", () => {
    render(
      <NotesDashboard
        futureNotes={[
          {
            id: "future-1",
            title: "Someday plan garden layout",
            created_at: "2026-05-25T10:00:00Z",
          },
        ]}
        inboxItems={[
          {
            id: "inbox-1",
            title: "Buy printer ink",
            created_at: "2026-05-25T11:00:00Z",
          },
        ]}
        weeklyNotes={[
          {
            id: "week-1",
            content: "Follow up with design agency.",
            week_start_date: "2026-05-23",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Notes" })).toBeInTheDocument();
    expect(screen.getByText("Someday plan garden layout")).toBeInTheDocument();
    expect(screen.getByText("Buy printer ink")).toBeInTheDocument();
    expect(screen.getByText("Follow up with design agency.")).toBeInTheDocument();
  });
});
