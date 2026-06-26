import { Loader2, Search, MessageCircle, TrendingUp, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminLayout from "@/components/AdminLayout";
import { formatNaira } from "./shared";

const when = (d: any) => {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t.getTime()) ? t.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
};
const whoName = (r: any) => r.userName || r.userEmail || (r.userId ? `User #${r.userId}` : "Guest");

type Bucket = { key: string; name: string; email: string | null; chats: any[]; searches: any[]; last: number };

export default function AdminInsights() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading } = trpc.admin.aiInsights.useQuery(undefined, { enabled: isAdmin });

  // Group chat + search activity by customer so each reads as one person's history.
  const buckets = new Map<string, Bucket>();
  const touch = (r: any): Bucket => {
    const key = r.userId != null ? `u${r.userId}` : "guest";
    if (!buckets.has(key)) buckets.set(key, { key, name: whoName(r), email: r.userEmail || null, chats: [], searches: [], last: 0 });
    const b = buckets.get(key)!;
    const ts = new Date(r.createdAt).getTime() || 0;
    if (ts > b.last) b.last = ts;
    return b;
  };
  for (const c of (data?.chats || [])) touch(c).chats.push(c);
  for (const s of (data?.searches || [])) touch(s).searches.push(s);
  const customers = Array.from(buckets.values()).sort((a, b) => b.last - a.last);

  return (
    <AdminLayout title="AI Insights" description="What customers ask, search for, and get shown — use it to improve the shop.">
      {isLoading || !data ? (
        <div className="py-24 flex items-center justify-center gap-3 tech-label">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading insights…
        </div>
      ) : (
        <div className="space-y-10">
          {/* Most surfaced products */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-signal" />
              <h2 className="display text-2xl">Most surfaced products</h2>
            </div>
            {data.topProducts.length === 0 ? (
              <div className="border border-ink/15 bg-card p-6 text-muted-foreground font-medium text-sm">No search activity yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.topProducts.map((t: any) => (
                  <div key={t.product.id} className="border border-ink/15 bg-card overflow-hidden">
                    <div className="aspect-square bg-secondary overflow-hidden">
                      <img src={t.product.imageUrl} alt={t.product.name} loading="lazy" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <div className="font-bold text-sm truncate">{t.product.name}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="mono text-sm font-bold">{formatNaira(t.product.price)}</span>
                        <span className="tech-label text-signal">{t.count}× shown</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Activity grouped by customer */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-signal" />
              <h2 className="display text-2xl">Activity by customer</h2>
              <span className="tech-label">· {customers.length}</span>
            </div>

            {customers.length === 0 ? (
              <div className="border border-ink/15 bg-card p-6 text-muted-foreground font-medium text-sm">No chat or search activity yet.</div>
            ) : (
              <div className="space-y-4">
                {customers.map(cust => (
                  <div key={cust.key} className="border border-ink/15 bg-card">
                    {/* customer header */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-ink/10 bg-secondary/40">
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{cust.name}</div>
                        {cust.email && <div className="tech-label truncate normal-case tracking-normal">{cust.email}</div>}
                      </div>
                      <div className="tech-label shrink-0 text-right">
                        {cust.chats.length} msg{cust.chats.length === 1 ? "" : "s"} · {cust.searches.length} search{cust.searches.length === 1 ? "" : "es"}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-ink/10">
                      {/* searches */}
                      <div className="p-4">
                        <div className="flex items-center gap-1.5 mb-2"><Search className="w-3.5 h-3.5 text-muted-foreground" /><span className="tech-label">Searches</span></div>
                        {cust.searches.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No searches.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {cust.searches.slice(0, 20).map((s: any) => (
                              <span key={s.id} title={when(s.createdAt)} className="inline-block text-xs font-medium bg-secondary px-2 py-1 max-w-full truncate">{s.query}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* chat conversation (oldest → newest) */}
                      <div className="p-4">
                        <div className="flex items-center gap-1.5 mb-2"><MessageCircle className="w-3.5 h-3.5 text-muted-foreground" /><span className="tech-label">Expert chat</span></div>
                        {cust.chats.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No chat.</p>
                        ) : (
                          <div className="space-y-2 max-h-72 overflow-y-auto">
                            {cust.chats.slice().reverse().map((c: any) => (
                              <div key={c.id} className={`text-xs ${c.role === "assistant" ? "" : "font-medium"}`}>
                                <span className={`text-[9px] font-bold uppercase tracking-wide mr-1.5 px-1 py-0.5 ${c.role === "assistant" ? "bg-signal text-white" : "bg-ink text-paper"}`}>{c.role === "assistant" ? "AI" : "Cust"}</span>
                                <span className="break-words">{c.content}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
