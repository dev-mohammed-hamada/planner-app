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

  it("renders labeled form fields", () => {
    render(
      <>
        <TextField label="Email" name="email" type="email" />
        <SelectField label="Theme" name="theme">
          <option value="system">System</option>
        </SelectField>
      </>,
    );

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
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
});
