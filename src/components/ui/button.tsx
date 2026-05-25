import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet" | "destructive";
};

const variants = {
  primary: "tm-button-primary",
  secondary: "tm-button-secondary",
  quiet: "tm-button-quiet",
  destructive: "tm-button-destructive",
};

export function Button({
  children,
  className = "",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button className={`tm-button ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
