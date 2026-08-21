import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useActionState: () => [{}, vi.fn(), false],
  };
});

import { QuickAddModal } from "@/components/planner/quick-add-modal";

describe("QuickAddModal", () => {
  it("opens, shows manual overrides, and closes", async () => {
    const user = userEvent.setup();

    render(<QuickAddModal />);

    await user.click(screen.getByRole("button", { name: "Quick add" }));

    expect(screen.getByRole("dialog", { name: "Quick add" })).toBeInTheDocument();
    expect(screen.getByLabelText("Capture text")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Time")).toBeInTheDocument();
    expect(screen.getByLabelText("Block")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Quick add" })).not.toBeInTheDocument();
  });
});
