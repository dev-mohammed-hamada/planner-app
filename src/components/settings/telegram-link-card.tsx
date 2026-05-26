"use client";

import { useActionState } from "react";
import { IconBrandTelegram, IconRefresh } from "@tabler/icons-react";

import {
  requestTelegramLinkCode,
  type TelegramLinkActionState,
} from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Section, SectionRow } from "@/components/ui/section";

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
    <Section title="Telegram">
      <SectionRow
        title="Bot connection"
        description={statusLabel(status)}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full bg-[var(--tm-surface-low)] text-[var(--tm-primary)]"
          >
            <IconBrandTelegram className="size-5" />
          </span>
          <form action={formAction}>
            <Button
              disabled={isPending || isLinked}
              type="submit"
              variant="primary"
            >
              <IconRefresh aria-hidden="true" className="size-4" />
              <span className="ml-2">
                {isLinked
                  ? "Linked"
                  : isPending
                    ? "Creating"
                    : "Create one-time code"}
              </span>
            </Button>
          </form>
        </div>
      </SectionRow>

      {expiry || state.code || state.error ? (
        <SectionRow
          title="Latest code"
          description={
            expiry ? `Current code expires at ${expiry}.` : undefined
          }
        >
          <div className="flex flex-col items-end gap-2">
            {state.code ? (
              <div className="rounded-md border border-[var(--tm-border)] bg-[var(--tm-surface-low)] px-4 py-3 text-right">
                <p className="font-[var(--font-jetbrains-mono)] text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tm-text-muted)]">
                  One-time code
                </p>
                <p className="font-[var(--font-jetbrains-mono)] text-2xl font-semibold tracking-normal text-[var(--tm-text)]">
                  {state.code}
                </p>
                <p className="mt-1 text-sm text-[var(--tm-text-muted)]">
                  Send this code to the Telegram bot within 15 minutes.
                </p>
              </div>
            ) : null}

            {state.error ? (
              <p
                className="text-sm text-[var(--tm-danger,#b91c1c)]"
                role="alert"
              >
                {state.error}
              </p>
            ) : null}
          </div>
        </SectionRow>
      ) : null}
    </Section>
  );
}
