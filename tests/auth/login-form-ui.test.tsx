import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useActionState: () => [{}, vi.fn(), false],
  };
});

import { MagicLinkLoginForm } from "@/components/auth/magic-link-login-form";

describe("MagicLinkLoginForm", () => {
  it("uses the shared form controls and button language", () => {
    render(<MagicLinkLoginForm nextPath="/planner" />);

    expect(screen.getByLabelText("Email")).toHaveClass("tm-field");
    expect(screen.getByRole("button", { name: "Send sign-in link" })).toHaveClass(
      "tm-button-primary",
    );
  });
});
