import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { Section, SectionRow } from "@/components/ui/section";
import { Toggle } from "@/components/ui/toggle";

describe("UI primitives", () => {
  it("renders variant-aware buttons", () => {
    render(<Button variant="primary">Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(
      "tm-button-primary",
    );
  });

  it("renders icon and disabled button states", () => {
    render(
      <>
        <Button aria-label="Add item" variant="icon">
          +
        </Button>
        <Button disabled={true} variant="destructive">
          Delete
        </Button>
      </>,
    );

    expect(screen.getByRole("button", { name: "Add item" })).toHaveClass(
      "tm-button-icon",
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass(
      "tm-button-disabled",
    );
  });

  it("renders labeled form fields", () => {
    render(
      <>
        <TextField className="custom-field" label="Email" name="email" type="email" />
        <SelectField label="Theme" name="theme">
          <option value="system">System</option>
        </SelectField>
      </>,
    );

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveClass("tm-field", "custom-field");
    expect(screen.getByLabelText("Theme")).toBeInTheDocument();
  });

  it("renders sections, rows, and toggles", () => {
    render(
      <Section title="Display">
        <SectionRow title="System theme" description="Match the device setting.">
          <Toggle checked={true} label="System theme" name="theme" />
        </SectionRow>
      </Section>,
    );

    expect(screen.getByRole("heading", { name: "Display" })).toBeInTheDocument();
    expect(screen.getByText("Match the device setting.")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "System theme" })).toBeChecked();
  });

  it("renders distinct checked and unchecked toggle visuals", () => {
    render(
      <>
        <Toggle checked={false} label="Email alerts" name="email-alerts" />
        <Toggle checked={true} label="Push alerts" name="push-alerts" />
      </>,
    );

    const uncheckedToggle = screen.getByRole("switch", { name: "Email alerts" });
    const checkedToggle = screen.getByRole("switch", { name: "Push alerts" });

    expect(uncheckedToggle).not.toBeChecked();
    expect(uncheckedToggle.nextElementSibling).not.toHaveClass("tm-toggle-checked");
    expect(checkedToggle).toBeChecked();
    expect(checkedToggle.nextElementSibling).toHaveClass("tm-toggle-checked");
  });
});
