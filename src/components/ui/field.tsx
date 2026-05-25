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
  className = "",
  label,
  name,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--tm-text)]">{label}</span>
      <input className={`tm-field ${className}`} name={name} {...props} />
    </label>
  );
}

export function TextareaField({
  className = "",
  label,
  name,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--tm-text)]">{label}</span>
      <textarea
        className={`tm-field min-h-28 resize-y ${className}`}
        name={name}
        {...props}
      />
    </label>
  );
}

export function SelectField({
  children,
  className = "",
  label,
  name,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--tm-text)]">{label}</span>
      <select className={`tm-field ${className}`} name={name} {...props}>
        {children}
      </select>
    </label>
  );
}
