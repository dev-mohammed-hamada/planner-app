"use client";

import { useActionState } from "react";

import { requestMagicLinkAction } from "@/app/auth/login/actions";
import type { MagicLinkActionState } from "@/app/auth/login/actions";

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
    <form action={formAction} className="planner-paper-sheet planner-rule flex w-full max-w-md flex-col gap-4 rounded-lg border p-5 shadow-sm shadow-stone-200/60">
      <input type="hidden" name="next" value={nextPath} />

      <label className="flex flex-col gap-2">
        <span className="planner-ink text-sm font-medium">Email</span>
        <input
          className="planner-rule planner-ink rounded-md border bg-white px-3 py-2 text-base outline-none focus:border-[#397367]"
          dir="auto"
          name="email"
          required
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
      </label>

      <button
        className="rounded-md bg-[#397367] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2f5f55] disabled:cursor-not-allowed disabled:bg-[#94a19b]"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Sending..." : "Send sign-in link"}
      </button>

      {state.message ? (
        <p className="planner-ink-muted text-sm" role="status">
          {state.message}
        </p>
      ) : null}

      {state.error ? (
        <p className="planner-warn text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
