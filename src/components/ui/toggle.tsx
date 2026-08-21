import type { InputHTMLAttributes } from "react";

type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function Toggle({
  checked,
  label,
  name,
  onChange,
  readOnly,
  ...props
}: ToggleProps) {
  const isChecked = checked === true;
  const effectiveReadOnly = readOnly ?? (checked !== undefined && onChange === undefined);

  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{label}</span>
      <input
        checked={checked}
        className="peer sr-only"
        name={name}
        onChange={onChange}
        readOnly={effectiveReadOnly}
        role="switch"
        type="checkbox"
        {...props}
      />
      <span
        className={
          isChecked
            ? "tm-toggle tm-toggle-checked peer-checked:bg-[var(--tm-primary)] peer-checked:justify-end"
            : "tm-toggle peer-checked:bg-[var(--tm-primary)] peer-checked:justify-end"
        }
      >
        <span className="tm-toggle-thumb" />
      </span>
    </label>
  );
}
