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
