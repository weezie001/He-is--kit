// Numbered pager — shows Prev · 1 2 3 … · Next. Renders nothing for a single page.
export default function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center flex-wrap gap-2 mt-8">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        className="px-3 h-9 border border-ink/15 text-[11px] font-bold uppercase tracking-wide hover:border-ink transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
      >
        Prev
      </button>
      {Array.from({ length: pages }, (_, n) => (
        <button
          key={n}
          onClick={() => onPage(n)}
          aria-current={n === page ? "page" : undefined}
          className={`w-9 h-9 text-sm font-bold transition-colors cursor-pointer ${n === page ? "bg-ink text-paper" : "border border-ink/15 hover:border-ink"}`}
        >
          {n + 1}
        </button>
      ))}
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= pages - 1}
        className="px-3 h-9 border border-ink/15 text-[11px] font-bold uppercase tracking-wide hover:border-ink transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
      >
        Next
      </button>
    </div>
  );
}
