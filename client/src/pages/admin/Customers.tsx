import { useMemo, useState } from "react";
import { Loader2, Search, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminLayout from "@/components/AdminLayout";
import { formatNaira, formatDate } from "./shared";

export default function AdminCustomers() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: customers, isLoading } = trpc.admin.customers.list.useQuery(undefined, { enabled: isAdmin });

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (customers as any[]) || [];
    if (!q) return list;
    return list.filter(c => `${c.name || ""} ${c.email || ""} ${c.favoriteTeam || ""}`.toLowerCase().includes(q));
  }, [customers, query]);

  return (
    <AdminLayout title="Customers" description={customers ? `${customers.length} registered` : "Your customer base"}>
      <div className="relative max-w-sm mb-5">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or email…" className="field !pl-10 !py-2.5" />
      </div>

      {isLoading ? (
        <div className="py-24 flex items-center justify-center gap-3 tech-label"><Loader2 className="w-5 h-5 animate-spin" /> Loading customers…</div>
      ) : filtered.length === 0 ? (
        <div className="border border-ink/15 p-10 text-center text-muted-foreground font-medium">{query ? "No customers match your search." : "No customers yet."}</div>
      ) : (
        <div className="border border-ink/15 bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-ink/15 text-left">
                <th scope="col" className="p-3 tech-label font-bold">Customer</th>
                <th scope="col" className="p-3 tech-label font-bold">Sign-in</th>
                <th scope="col" className="p-3 tech-label font-bold text-right">Orders</th>
                <th scope="col" className="p-3 tech-label font-bold text-right">Spent</th>
                <th scope="col" className="p-3 tech-label font-bold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-secondary/60 transition-colors">
                  <td className="p-3 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 grid place-items-center bg-ink text-paper font-bold shrink-0 display text-base">
                        {(c.name || c.email || "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold truncate max-w-[220px] flex items-center gap-1.5">
                          {c.name || "—"}
                          {c.role === "admin" && <ShieldCheck className="w-3.5 h-3.5 text-signal shrink-0" aria-label="Admin" />}
                        </div>
                        <div className="tech-label mt-0.5 normal-case tracking-normal font-medium truncate max-w-[220px]">{c.email || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 capitalize whitespace-nowrap text-muted-foreground">{c.loginMethod || "oauth"}</td>
                  <td className="p-3 text-right font-bold mono">{c.orderCount}</td>
                  <td className="p-3 text-right font-bold mono whitespace-nowrap">{formatNaira(c.totalSpent)}</td>
                  <td className="p-3 whitespace-nowrap text-muted-foreground">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
