"use client";

import { useActionState } from "react";

import { requestMagicLinkAction } from "@/app/auth/login/actions";
import type { MagicLinkActionState } from "@/app/auth/login/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";

type MagicLinkLoginFormProps = {
  nextPath: string;
};

const initialState: MagicLinkActionState = {};

export function MagicLinkLoginForm({ nextPath }: MagicLinkLoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    requestMagicLinkAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-[var(--tm-border)] bg-[var(--tm-surface-lowest)] p-5 shadow-sm shadow-slate-200/70"
    >
      <input type="hidden" name="next" value={nextPath} />

      <TextField
        autoComplete="email"
        dir="auto"
        label="Email"
        name="email"
        placeholder="you@example.com"
        required
        type="email"
      />

      <Button className="w-full" disabled={isPending} type="submit" variant="primary">
        {isPending ? "Sending..." : "Send sign-in link"}
      </Button>

      {state.message ? (
        <p className="text-sm text-[var(--tm-text-muted)]" role="status">
          {state.message}
        </p>
      ) : null}

      {state.error ? (
        <p className="text-sm text-[var(--tm-error)]" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
