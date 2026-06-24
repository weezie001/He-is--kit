// Shared helpers + small UI bits for the admin pages.

export const NAIRA = "₦";

export function formatNaira(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${NAIRA}${(Number.isFinite(n) ? n : 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Categories are derived from live product data — see @/lib/categories
// (labelizeCategory + useCategories). The admin form lets you type any category.

export const STYLE_OPTIONS = ["Classic", "Modern", "Bold", "Minimalist"];

export const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
export const PAYMENT_STATUSES = ["pending", "completed", "failed"] as const;

// Colour treatment per order/payment status. Uses tag classes from index.css.
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-secondary text-muted-foreground border-border",
  processing: "bg-signal/10 text-signal border-signal/40",
  shipped: "bg-ink text-paper border-ink",
  delivered: "bg-emerald-600 text-white border-emerald-600",
  cancelled: "bg-transparent text-destructive border-destructive",
  completed: "bg-emerald-600 text-white border-emerald-600",
  failed: "bg-transparent text-destructive border-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] || "bg-secondary text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${cls}`}>
      {status}
    </span>
  );
}

// Big number stat tile used on the dashboard.
export function StatCard({
  label, value, sub, accent = false,
}: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`border p-5 ${accent ? "border-signal bg-signal/5" : "border-ink/15 bg-card"}`}>
      <div className="tech-label">{label}</div>
      <div className={`display text-[clamp(1.8rem,4vw,2.6rem)] mt-2 leading-none mono ${accent ? "text-signal" : ""}`}>{value}</div>
      {sub && <div className="tech-label mt-2 text-muted-foreground normal-case tracking-normal font-medium">{sub}</div>}
    </div>
  );
}
