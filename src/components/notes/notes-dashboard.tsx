export type NotesFutureItem = {
  id: string;
  title: string;
  created_at: string;
};

export type NotesInboxItem = {
  id: string;
  title: string;
  created_at: string;
};

export type WeeklyNoteEntry = {
  id: string;
  content: string;
  week_start_date: string;
};

type NotesDashboardProps = {
  futureNotes: NotesFutureItem[];
  inboxItems: NotesInboxItem[];
  weeklyNotes: WeeklyNoteEntry[];
};

export function NotesDashboard({
  futureNotes,
  inboxItems,
  weeklyNotes,
}: NotesDashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-normal">Notes</h1>
      </header>

      <section className="tm-section">
        <h2 className="mb-3 border-b border-[var(--tm-border)] pb-2 font-[var(--font-manrope)] text-xl font-bold">
          Future notes
        </h2>
        {futureNotes.length > 0 ? (
          <ul className="flex flex-col">
            {futureNotes.map((item) => (
              <li className="tm-section-row" key={item.id}>
                <p className="text-sm leading-6" dir="auto">
                  {item.title}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--tm-text-muted)]">
            No future notes yet.
          </p>
        )}
      </section>

      <section className="tm-section">
        <h2 className="mb-3 border-b border-[var(--tm-border)] pb-2 font-[var(--font-manrope)] text-xl font-bold">
          Inbox captures
        </h2>
        {inboxItems.length > 0 ? (
          <ul className="flex flex-col">
            {inboxItems.map((item) => (
              <li className="tm-section-row" key={item.id}>
                <p className="text-sm leading-6" dir="auto">
                  {item.title}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--tm-text-muted)]">
            No inbox captures yet.
          </p>
        )}
      </section>

      <section className="tm-section">
        <h2 className="mb-3 border-b border-[var(--tm-border)] pb-2 font-[var(--font-manrope)] text-xl font-bold">
          Weekly archive
        </h2>
        {weeklyNotes.length > 0 ? (
          <ul className="flex flex-col">
            {weeklyNotes.map((note) => (
              <li className="tm-section-row" key={note.id}>
                <p className="text-sm leading-6" dir="auto">
                  {note.content}
                </p>
                <time
                  className="shrink-0 text-xs text-[var(--tm-text-muted)]"
                  dateTime={note.week_start_date}
                >
                  {note.week_start_date}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--tm-text-muted)]">
            No weekly notes yet.
          </p>
        )}
      </section>
    </div>
  );
}
