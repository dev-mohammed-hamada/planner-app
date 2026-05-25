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
