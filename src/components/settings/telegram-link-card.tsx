"use client";

import { useActionState } from "react";
import { IconBrandTelegram, IconRefresh } from "@tabler/icons-react";

import {
  requestTelegramLinkCode,
  type TelegramLinkActionState,
} from "@/app/(app)/settings/actions";

type TelegramLinkCardProps = {
  status: "pending" | "linked" | "revoked" | null;
  codeExpiresAt: string | null;
};

const initialState: TelegramLinkActionState = {};

function statusLabel(status: TelegramLinkCardProps["status"]) {
  if (status === "linked") {
    return "Linked";
  }

  if (status === "pending") {
    return "Pending code";
  }

  if (status === "revoked") {
    return "Revoked";
  }

  return "Not linked";
}

function formatExpiry(codeExpiresAt: string | null) {
  if (!codeExpiresAt) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(codeExpiresAt));
}

export function TelegramLinkCard({
  status,
  codeExpiresAt,
}: TelegramLinkCardProps) {
  const [state, formAction, isPending] = useActionState(
    requestTelegramLinkCode,
    initialState,
  );
  const expiry = formatExpiry(codeExpiresAt);
  const isLinked = status === "linked";

  return (
    <section className="planner-paper-sheet planner-rule rounded-lg border shadow-sm shadow-stone-200/60">
      <div className="planner-divider flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="planner-accent-bg planner-accent flex size-10 items-center justify-center rounded-full">
            <IconBrandTelegram className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="planner-ink text-base font-semibold">Telegram</h2>
            <p className="planner-ink-muted text-sm">{statusLabel(status)}</p>
          </div>
        </div>

        <form action={formAction}>
          <button
            className="planner-accent-bg planner-accent inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold disabled:opacity-60"
            disabled={isPending || isLinked}
            type="submit"
          >
            <IconRefresh className="size-4" aria-hidden="true" />
            {isLinked ? "Linked" : isPending ? "Creating" : "Create one-time code"}
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {expiry ? (
          <p className="planner-ink-muted text-sm">Current code expires at {expiry}.</p>
        ) : null}

        {state.code ? (
          <div className="planner-paper-soft planner-rule rounded-md border px-4 py-3">
            <p className="planner-ink-muted text-xs font-semibold uppercase tracking-normal">
              One-time code
            </p>
            <p className="planner-ink font-mono text-2xl font-semibold tracking-normal">
              {state.code}
            </p>
            <p className="planner-ink-muted mt-1 text-sm">
              Send this code to the Telegram bot within 15 minutes.
            </p>
          </div>
        ) : null}

        {state.error ? (
          <p className="planner-warn text-sm" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
