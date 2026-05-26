import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NotesDashboard } from "@/components/notes/notes-dashboard";

describe("NotesDashboard", () => {
  afterEach(() => {
    cleanup();
  });

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

  it("renders note collections when provided", () => {
    render(
      <NotesDashboard
        collections={[{ id: "collection-1", name: "Ideas", sort_order: 0 }]}
        futureNotes={[]}
        inboxItems={[]}
        notes={[{ id: "note-1", title: "Launch", content: "Write launch notes.", collection_id: "collection-1" }]}
        weeklyNotes={[]}
      />,
    );

    expect(screen.getByText("Ideas")).toBeInTheDocument();
    expect(screen.getByText("Launch")).toBeInTheDocument();
    expect(screen.getByText("Write launch notes.")).toBeInTheDocument();
  });
});
