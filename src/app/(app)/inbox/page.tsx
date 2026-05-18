import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type InboxItem = {
  id: string;
  title: string;
  bucket: "inbox" | "future_notes";
  created_at: string;
};

function bucketLabel(bucket: InboxItem["bucket"]) {
  return bucket === "future_notes" ? "Future notes" : "Inbox";
}

function formatCreatedAt(createdAt: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: items } = await supabase
    .from("planner_items")
    .select("id,title,bucket,created_at")
    .eq("user_id", user.id)
    .neq("status", "deleted")
    .in("bucket", ["inbox", "future_notes"])
    .order("created_at", { ascending: false });

  const inboxItems = (items ?? []) as InboxItem[];

  return (
    <main className="planner-paper min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <header className="flex flex-col gap-1">
          <p className="planner-accent text-sm font-semibold">Inbox</p>
          <h1 className="planner-ink text-2xl font-semibold tracking-normal">
            Captured items
          </h1>
        </header>

        <section className="planner-paper-sheet planner-rule rounded-lg border shadow-sm shadow-stone-200/60">
          <header className="planner-divider border-b px-4 py-3">
            <h2 className="planner-ink text-base font-semibold">
              Inbox and future notes
            </h2>
          </header>

          {inboxItems.length > 0 ? (
            <ul className="divide-y planner-divider">
              {inboxItems.map((item) => (
                <li
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  key={item.id}
                >
                  <div className="min-w-0">
                    <p className="planner-ink text-sm leading-6" dir="auto">
                      {item.title}
                    </p>
                    <p className="planner-ink-muted text-xs">
                      {bucketLabel(item.bucket)}
                    </p>
                  </div>
                  <time
                    className="planner-ink-faint shrink-0 text-xs"
                    dateTime={item.created_at}
                  >
                    {formatCreatedAt(item.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="planner-ink-faint px-4 py-6 text-sm">
              No active inbox items.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
