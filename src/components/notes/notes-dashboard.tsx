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

export type NoteCollectionEntry = {
  id: string;
  name: string;
  sort_order: number;
};

export type NoteEntry = {
  id: string;
  title: string;
  content: string;
  collection_id: string | null;
};

type NotesDashboardProps = {
  futureNotes: NotesFutureItem[];
  inboxItems: NotesInboxItem[];
  weeklyNotes: WeeklyNoteEntry[];
  collections?: NoteCollectionEntry[];
  notes?: NoteEntry[];
};

export function NotesDashboard({
  futureNotes,
  inboxItems,
  weeklyNotes,
  collections,
  notes,
}: NotesDashboardProps) {
  const orderedCollections = (collections ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  const allNotes = notes ?? [];

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

      {orderedCollections.map((collection) => {
        const collectionNotes = allNotes.filter(
          (note) => note.collection_id === collection.id,
        );
        return (
          <section className="tm-section" key={collection.id}>
            <h2 className="mb-3 border-b border-[var(--tm-border)] pb-2 font-[var(--font-manrope)] text-xl font-bold">
              {collection.name}
            </h2>
            {collectionNotes.length > 0 ? (
              <ul className="flex flex-col">
                {collectionNotes.map((note) => (
                  <li className="tm-section-row" key={note.id}>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold leading-6" dir="auto">
                        {note.title}
                      </p>
                      <p
                        className="text-sm leading-6 text-[var(--tm-text-muted)]"
                        dir="auto"
                      >
                        {note.content}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--tm-text-muted)]">
                No notes in this collection yet.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
