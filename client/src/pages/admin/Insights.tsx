import { Loader2, Search, MessageCircle, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminLayout from "@/components/AdminLayout";
import { formatNaira } from "./shared";

const when = (d: any) => {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t.getTime()) ? t.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
};
const who = (r: any) => r.userName || r.userEmail || (r.userId ? `User #${r.userId}` : "Guest");

export default function AdminInsights() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading } = trpc.admin.aiInsights.useQuery(undefined, { enabled: isAdmin });

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

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent searches */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-signal" />
                <h2 className="display text-2xl">Recent searches</h2>
              </div>
              <div className="border border-ink/15 bg-card divide-y divide-ink/10 max-h-[520px] overflow-y-auto">
                {data.searches.length === 0 ? (
                  <p className="p-5 text-muted-foreground font-medium text-sm">No searches yet.</p>
                ) : (
                  data.searches.slice(0, 60).map((s: any) => (
                    <div key={s.id} className="p-4">
                      <p className="font-bold text-sm break-words">{s.query}</p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="tech-label truncate">{who(s)}</span>
                        <span className="tech-label shrink-0">{when(s.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Recent expert-chat */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-5 h-5 text-signal" />
                <h2 className="display text-2xl">Expert-chat activity</h2>
              </div>
              <div className="border border-ink/15 bg-card divide-y divide-ink/10 max-h-[520px] overflow-y-auto">
                {data.chats.length === 0 ? (
                  <p className="p-5 text-muted-foreground font-medium text-sm">No chat activity yet.</p>
                ) : (
                  data.chats.slice(0, 80).map((c: any) => (
                    <div key={c.id} className="p-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 ${c.role === "assistant" ? "bg-signal text-white" : "bg-secondary text-ink"}`}>
                          {c.role === "assistant" ? "AI" : "Customer"}
                        </span>
                        <span className="tech-label shrink-0">{when(c.createdAt)}</span>
                      </div>
                      <p className="text-sm break-words line-clamp-4">{c.content}</p>
                      <span className="tech-label mt-1 inline-block truncate">{who(c)}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
