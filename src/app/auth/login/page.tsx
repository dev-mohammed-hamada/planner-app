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
    <main className="planner-paper flex min-h-screen items-center justify-center px-4 py-8">
      <section className="flex w-full max-w-md flex-col gap-5">
        <header className="flex flex-col gap-2">
          <p className="planner-accent text-sm font-semibold">Private planner</p>
          <h1 className="planner-ink text-3xl font-semibold tracking-normal">
            Sign in with email
          </h1>
          <p className="planner-ink-muted text-sm leading-6">
            Enter the email that has access to this planner.
          </p>
        </header>

        {params.error ? (
          <p className="planner-warn text-sm" role="alert">
            The sign-in link could not be used. Please request a new one.
          </p>
        ) : null}

        <MagicLinkLoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
