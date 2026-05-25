"use client";

import { useActionState, useEffect, useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import {
  createQuickAddAction,
  type QuickAddActionState,
} from "@/app/(app)/actions";

const initialState: QuickAddActionState = {};

export function QuickAddModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createQuickAddAction,
    initialState,
  );

  useEffect(() => {
    if (state.message) {
      setOpen(false);
    }
  }, [state.message]);

  return (
    <>
      <button
        className="tm-button tm-button-primary"
        onClick={() => setOpen(true)}
        type="button"
      >
        <IconPlus aria-hidden="true" className="size-4" />
        Quick add
      </button>
      {open ? (
        <div
          aria-label="Quick add"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-lg bg-[var(--tm-surface-raised)] p-6 shadow-xl">
            <header className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--tm-text)]">
                Quick add
              </h2>
            </header>
            <form action={formAction} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[var(--tm-text)]">
                  Capture text
                </span>
                <textarea
                  aria-label="Capture text"
                  className="tm-field min-h-28 resize-y text-lg"
                  name="captureText"
                  placeholder="Review Q3 financials with Sarah @14:00 #tomorrow"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-[var(--tm-text)]">
                    Date
                  </span>
                  <input
                    aria-label="Date"
                    className="tm-field"
                    name="itemDate"
                    type="date"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-[var(--tm-text)]">
                    Time
                  </span>
                  <input
                    aria-label="Time"
                    className="tm-field"
                    name="itemTime"
                    type="time"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-[var(--tm-text)]">
                    Block
                  </span>
                  <select
                    aria-label="Block"
                    className="tm-field"
                    defaultValue=""
                    name="block"
                  >
                    <option value="">Auto</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="unsorted">Unsorted</option>
                    <option value="none">None</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-[var(--tm-text)]">
                    Bucket
                  </span>
                  <select
                    aria-label="Bucket"
                    className="tm-field"
                    defaultValue=""
                    name="bucket"
                  >
                    <option value="">Auto</option>
                    <option value="weekly_spread">Weekly spread</option>
                    <option value="inbox">Inbox</option>
                    <option value="future_notes">Future notes</option>
                  </select>
                </label>
              </div>
              {state.error ? (
                <p className="text-sm text-[var(--tm-danger)]" role="alert">
                  {state.error}
                </p>
              ) : null}
              <footer className="mt-2 flex items-center justify-end gap-2">
                <button
                  className="tm-button tm-button-quiet"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="tm-button tm-button-primary"
                  disabled={pending}
                  type="submit"
                >
                  {pending ? "Saving..." : "Save"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
