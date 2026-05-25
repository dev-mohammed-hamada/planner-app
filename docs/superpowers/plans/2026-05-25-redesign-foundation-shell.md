# Redesign Foundation And Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared visual foundation, UI primitives, and protected app shell for the full platform redesign.

**Architecture:** Add design tokens in `src/app/globals.css`, Google font variables in `src/app/layout.tsx`, focused UI primitives under `src/components/ui/`, and a client `AppShell` under `src/components/app/`. Protected routes use a new `src/app/(app)/layout.tsx`; auth routes stay outside the shell but use the same token classes.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Tabler Icons, Vitest, Testing Library.

---

## File Structure

- Modify `src/app/globals.css`: shared color, typography, focus, surface, and utility classes.
- Modify `src/app/layout.tsx`: load Inter, Manrope, and JetBrains Mono via `next/font/google` and expose CSS variables.
- Create `src/components/ui/button.tsx`: button variants for primary, secondary, quiet, icon, and destructive actions.
- Create `src/components/ui/field.tsx`: text input, textarea, and select wrappers.
- Create `src/components/ui/section.tsx`: operational page sections and row shell.
- Create `src/components/ui/toggle.tsx`: accessible toggle control.
- Create `src/components/app/app-shell.tsx`: desktop top nav, mobile bottom nav, active route state, and global Quick add launcher slot.
- Create `src/app/(app)/layout.tsx`: wraps protected pages in `AppShell`.
- Modify `src/app/auth/login/page.tsx`: align login with the new tokens without using the protected shell.
- Modify `src/components/auth/magic-link-login-form.tsx`: use shared field and button styling.
- Test `tests/components/app-shell.test.tsx`.
- Test `tests/components/ui-primitives.test.tsx`.

---

### Task 1: Add AppShell Navigation

**Files:**
- Create: `src/components/app/app-shell.tsx`
- Create: `src/app/(app)/layout.tsx`
- Test: `tests/components/app-shell.test.tsx`

- [ ] **Step 1: Write the failing AppShell navigation test**

```tsx
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

    expect(screen.getByText("Time Manager")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Week" })[0]).toHaveAttribute(
      "href",
      "/planner",
    );
    expect(screen.getAllByRole("link", { name: "Calendar" })[0]).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getAllByRole("link", { name: "Notes" })[0]).toHaveAttribute(
      "href",
      "/notes",
    );
    expect(screen.getAllByRole("link", { name: "Settings" })[0]).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.getByRole("button", { name: "Quick add" })).toBeInTheDocument();
    expect(screen.getByText("Calendar body")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/app-shell.test.tsx`

Expected: FAIL because `@/components/app/app-shell` does not exist.

- [ ] **Step 3: Implement `AppShell`**

```tsx
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
              className={active ? "tm-mobile-nav-link tm-mobile-nav-link-active" : "tm-mobile-nav-link"}
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
```

- [ ] **Step 4: Wrap protected routes**

```tsx
import type { ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/components/app-shell.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/app/app-shell.tsx 'src/app/(app)/layout.tsx' tests/components/app-shell.test.tsx
git commit -m "feat: add redesigned app shell"
```

---

### Task 2: Add Design Tokens And UI Primitives

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/field.tsx`
- Create: `src/components/ui/section.tsx`
- Create: `src/components/ui/toggle.tsx`
- Test: `tests/components/ui-primitives.test.tsx`

- [ ] **Step 1: Write the failing primitive tests**

```tsx
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/ui-primitives.test.tsx`

Expected: FAIL because the UI primitive modules do not exist.

- [ ] **Step 3: Add token CSS**

```css
@import "tailwindcss";

:root {
  --tm-background: #fcf8fa;
  --tm-surface-base: #f8fafc;
  --tm-surface: #fcf8fa;
  --tm-surface-lowest: #ffffff;
  --tm-surface-low: #f6f3f5;
  --tm-paper-desk: #e5dfd3;
  --tm-paper: #faf7f0;
  --tm-paper-deep: #f2eddf;
  --tm-paper-elevated: #fffdf7;
  --tm-text: #1b1b1d;
  --tm-text-muted: #64748b;
  --tm-text-soft: #45464d;
  --tm-outline: #76777d;
  --tm-outline-variant: #c6c6cd;
  --tm-border: #e2e8f0;
  --tm-rule: #e5dfd3;
  --tm-rule-strong: #c9c2b0;
  --tm-primary: #000000;
  --tm-on-primary: #ffffff;
  --tm-secondary: #0058be;
  --tm-secondary-soft: #d8e2ff;
  --tm-success: #10b981;
  --tm-error: #ef4444;
  --tm-warn: #b45309;
}

@theme inline {
  --color-background: var(--tm-background);
  --color-foreground: var(--tm-text);
  --font-sans: var(--font-inter), Inter, Arial, Helvetica, sans-serif;
  --font-display: var(--font-manrope), Manrope, Inter, sans-serif;
  --font-mono: var(--font-jetbrains-mono), "SFMono-Regular", Consolas, monospace;
}

body {
  background: var(--tm-background);
  color: var(--tm-text);
  font-family: var(--font-inter), Inter, Arial, Helvetica, sans-serif;
}

.tm-topbar {
  align-items: center;
  background: var(--tm-background);
  border-bottom: 1px solid var(--tm-outline-variant);
  display: flex;
  justify-content: space-between;
  min-height: 5.5rem;
  padding: 1rem 1.5rem;
}

.tm-brand {
  color: var(--tm-primary);
  font-family: var(--font-manrope), Inter, sans-serif;
  font-size: 1.5rem;
  font-weight: 800;
  text-decoration: none;
}

.tm-desktop-nav {
  display: none;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .tm-desktop-nav {
    display: flex;
  }
}

.tm-nav-link,
.tm-mobile-nav-link {
  color: var(--tm-text-soft);
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.75rem;
  text-decoration: none;
}

.tm-nav-link-active {
  border-bottom: 2px solid var(--tm-primary);
  color: var(--tm-primary);
  font-weight: 700;
  padding-bottom: 0.25rem;
}

.tm-mobile-nav {
  align-items: center;
  background: var(--tm-background);
  border-top: 1px solid var(--tm-outline-variant);
  bottom: 0;
  display: flex;
  justify-content: space-around;
  left: 0;
  padding: 0.5rem 1rem;
  position: fixed;
  right: 0;
  z-index: 40;
}

@media (min-width: 768px) {
  .tm-mobile-nav {
    display: none;
  }
}

.tm-mobile-nav-link {
  align-items: center;
  border-radius: 0.5rem;
  display: inline-flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 4rem;
  padding: 0.375rem 0.5rem;
}

.tm-mobile-nav-link-active {
  background: var(--tm-surface-low);
  color: var(--tm-primary);
  font-weight: 700;
}

.tm-button {
  align-items: center;
  border-radius: 0.5rem;
  display: inline-flex;
  font-size: 0.875rem;
  font-weight: 700;
  gap: 0.5rem;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0.5rem 1rem;
}

.tm-button-primary {
  background: var(--tm-primary);
  color: var(--tm-on-primary);
}

.tm-button-secondary,
.tm-button-quiet {
  background: var(--tm-surface-lowest);
  border: 1px solid var(--tm-border);
  color: var(--tm-primary);
}

.tm-button-destructive {
  background: var(--tm-error);
  color: #ffffff;
}

.tm-field {
  background: var(--tm-surface-lowest);
  border: 1px solid var(--tm-border);
  border-radius: 0.5rem;
  color: var(--tm-text);
  min-height: 2.5rem;
  padding: 0.5rem 0.75rem;
}

.tm-section {
  background: var(--tm-surface-lowest);
  border: 1px solid var(--tm-border);
  border-radius: 0.75rem;
  overflow: hidden;
}

.tm-section-row {
  align-items: center;
  border-top: 1px solid var(--tm-border);
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  padding: 1rem 1.25rem;
}

.tm-section-row:first-child {
  border-top: 0;
}

.tm-toggle {
  align-items: center;
  background: var(--tm-primary);
  border-radius: 999px;
  display: inline-flex;
  height: 1.75rem;
  justify-content: flex-end;
  padding: 0.1875rem;
  width: 3rem;
}

.tm-toggle-thumb {
  background: #ffffff;
  border-radius: 999px;
  height: 1.375rem;
  width: 1.375rem;
}
```

- [ ] **Step 4: Add font variables in the root layout**

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Planner",
  description: "A calm personal planning app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Add the primitive components**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet" | "destructive";
};

const variants = {
  primary: "tm-button-primary",
  secondary: "tm-button-secondary",
  quiet: "tm-button-quiet",
  destructive: "tm-button-destructive",
};

export function Button({
  children,
  className = "",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button className={`tm-button ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
```

```tsx
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type BaseProps = {
  label: string;
  name: string;
};

export function TextField({
  label,
  name,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--tm-text)]">{label}</span>
      <input className="tm-field" name={name} {...props} />
    </label>
  );
}

export function TextareaField({
  label,
  name,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--tm-text)]">{label}</span>
      <textarea className="tm-field min-h-28 resize-y" name={name} {...props} />
    </label>
  );
}

export function SelectField({
  children,
  label,
  name,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--tm-text)]">{label}</span>
      <select className="tm-field" name={name} {...props}>
        {children}
      </select>
    </label>
  );
}
```

```tsx
import type { ReactNode } from "react";

export function Section({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section>
      <h2 className="mb-3 border-b border-[var(--tm-border)] pb-2 font-[var(--font-manrope)] text-xl font-bold">
        {title}
      </h2>
      <div className="tm-section">{children}</div>
    </section>
  );
}

export function SectionRow({
  children,
  description,
  title,
}: {
  children?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="tm-section-row">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-[var(--tm-text-muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
```

```tsx
import type { InputHTMLAttributes } from "react";

type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function Toggle({ checked, label, name, ...props }: ToggleProps) {
  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{label}</span>
      <input
        checked={checked}
        className="peer sr-only"
        name={name}
        role="switch"
        type="checkbox"
        {...props}
      />
      <span className="tm-toggle peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--tm-secondary)]">
        <span className="tm-toggle-thumb" />
      </span>
    </label>
  );
}
```

- [ ] **Step 6: Run the primitive tests**

Run: `npx vitest run tests/components/ui-primitives.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/components/ui/button.tsx src/components/ui/field.tsx src/components/ui/section.tsx src/components/ui/toggle.tsx tests/components/ui-primitives.test.tsx
git commit -m "feat: add redesign tokens and ui primitives"
```

---

### Task 3: Restyle Login With The Shared System

**Files:**
- Modify: `src/app/auth/login/page.tsx`
- Modify: `src/components/auth/magic-link-login-form.tsx`
- Test: `tests/auth/login-form-ui.test.tsx`

- [ ] **Step 1: Write the failing login UI test**

```tsx
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/auth/login-form-ui.test.tsx`

Expected: FAIL because the form does not use shared primitive classes.

- [ ] **Step 3: Update the login page and form**

Use `TextField` and `Button` inside `MagicLinkLoginForm`, and update `LoginPage` to use `tm-surface-base`, `tm-surface-lowest`, and Manrope heading styles. Keep the existing action and hidden `next` input unchanged.

```tsx
<Button className="w-full" disabled={isPending} type="submit" variant="primary">
  {isPending ? "Sending..." : "Send sign-in link"}
</Button>
```

- [ ] **Step 4: Run the login UI test**

Run: `npx vitest run tests/auth/login-form-ui.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run all component and auth tests touched by this plan**

Run: `npx vitest run tests/components/app-shell.test.tsx tests/components/ui-primitives.test.tsx tests/auth/login-form-ui.test.tsx tests/auth/login-actions.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/auth/login/page.tsx src/components/auth/magic-link-login-form.tsx tests/auth/login-form-ui.test.tsx
git commit -m "feat: restyle login with redesign system"
```

