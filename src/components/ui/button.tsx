import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet" | "destructive" | "icon";
};

const variants = {
  primary: "tm-button-primary",
  secondary: "tm-button-secondary",
  quiet: "tm-button-quiet",
  destructive: "tm-button-destructive",
  icon: "tm-button-icon",
};

export function Button({
  children,
  className = "",
  disabled = false,
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  const classes = [
    "tm-button",
    variants[variant],
    disabled ? "tm-button-disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled} type={type} {...props}>
      {children}
    </button>
  );
}
