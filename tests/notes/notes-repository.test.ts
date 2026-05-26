import { describe, expect, it, vi } from "vitest";

import { createNote, listNoteCollections } from "@/lib/notes/notes-repository";

describe("notes repository", () => {
  it("lists note collections for the user", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: "collection-1", name: "Ideas", sort_order: 0 }],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const result = await listNoteCollections({ from } as never, "user-123");

    expect(from).toHaveBeenCalledWith("note_collections");
    expect(result).toEqual([{ id: "collection-1", name: "Ideas", sort_order: 0 }]);
  });

  it("creates active notes in a collection", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });

    await createNote({ from } as never, "user-123", {
      collection_id: "collection-1",
      content: "Write launch notes.",
      title: "Launch",
    });

    expect(from).toHaveBeenCalledWith("notes");
    expect(insert).toHaveBeenCalledWith({
      collection_id: "collection-1",
      content: "Write launch notes.",
      status: "active",
      title: "Launch",
      user_id: "user-123",
    });
  });
});
