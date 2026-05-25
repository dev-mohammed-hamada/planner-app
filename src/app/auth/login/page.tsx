import { sanitizeNextPath } from "@/lib/auth/redirects";
import { MagicLinkLoginForm } from "@/components/auth/magic-link-login-form";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--tm-surface-base)] px-4 py-8 text-[var(--tm-text)]">
      <section className="flex w-full max-w-md flex-col gap-5">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-[var(--tm-text-soft)]">
            Private planner
          </p>
          <h1 className="font-[var(--font-manrope)] text-3xl font-extrabold tracking-normal text-[var(--tm-primary)]">
            Sign in with email
          </h1>
          <p className="text-sm leading-6 text-[var(--tm-text-muted)]">
            Enter the email that has access to this planner.
          </p>
        </header>

        {params.error ? (
          <p
            className="rounded-lg border border-[var(--tm-border)] bg-[var(--tm-surface-lowest)] px-4 py-3 text-sm text-[var(--tm-error)]"
            role="alert"
          >
            The sign-in link could not be used. Please request a new one.
          </p>
        ) : null}

        <MagicLinkLoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
