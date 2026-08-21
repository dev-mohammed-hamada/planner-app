import type { ReactNode } from "react";

export function Section({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section>
      <h2 className="mb-3 border-b border-[var(--tm-border)] pb-2 font-[var(--font-manrope)] text-xl font-bold">
        {title}
      </h2>
      <div className="tm-section">{children}</div>
    </section>
  );
}

export function SectionRow({
  children,
  description,
  title,
}: {
  children?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="tm-section-row">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-[var(--tm-text-muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
